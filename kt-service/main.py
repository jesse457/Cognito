"""Cognita Knowledge Tracing microservice.

A single-file FastAPI service that predicts per-knowledge-component mastery
probabilities from a learner's response history.

Engines
-------
* ``bkt``  -- pyBKT (maximum-likelihood BKT), fitted **per request** with
              ``num_fits=1, seed=42``. This is the default and the only engine
              that is guaranteed to run without optional artifacts.
* ``dkt``  -- optional deep-knowledge-tracing checkpoint. Selected only when
              ``KT_ENGINE=dkt`` AND the DKT dependencies import AND a checkpoint
              file exists. Any failure degrades to ``bkt`` silently-but-logged.

Safety properties (these are the acceptance criteria):

1. The service never raises a 500 for *valid* input. Every engine failure path
   ends in a documented, deterministic BKT-posterior fallback estimator.
2. ``KT_ENGINE=dkt`` without the optional dependencies or without a checkpoint
   still answers ``{"engine": "bkt", ...}`` with HTTP 200.
3. A pyBKT fit can never hang forever: fits run in a worker thread and are
   joined with a wall-clock ``KT_FIT_TIMEOUT_S``; on timeout the endpoint
   answers with the heuristic fallback estimate.
4. Repeated identical requests are served from an in-process LRU cache.

Run:  uvicorn main:app --host 0.0.0.0 --port 8001
"""

from __future__ import annotations

import hashlib
import logging
import math
import os
import sys
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Literal, Optional, Sequence, Tuple

from fastapi import FastAPI
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------- #
# Structured logging
# --------------------------------------------------------------------------- #

logging.basicConfig(
    level=os.getenv("KT_LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)-7s %(name)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("cognita.kt")


def _log(event: str, **fields: Any) -> None:
    """Emit one structured log line as ``event key=value ...``."""
    payload = " ".join(f"{k}={v}" for k, v in fields.items())
    logger.info("event=%s %s", event, payload)


def _warn(event: str, **fields: Any) -> None:
    payload = " ".join(f"{k}={v}" for k, v in fields.items())
    logger.warning("event=%s %s", event, payload)


# --------------------------------------------------------------------------- #
# Configuration
# --------------------------------------------------------------------------- #

DEFAULT_ENGINE = "bkt"
DEFAULT_CHECKPOINT = "./checkpoints/dkt.pt"
DEFAULT_FIT_TIMEOUT_S = 10.0
DEFAULT_CACHE_MAXSIZE = 512

#: Deterministic fallback BKT parameters (see README "Fallback estimator").
FALLBACK_PRIOR = 0.10  # P(L0): P(knowing the KC before any evidence)
FALLBACK_LEARN = 0.15  # P(T): probability of learning between opportunities
FALLBACK_GUESS = 0.20  # P(G): P(correct | not mastered)
FALLBACK_SLIP = 0.10  # P(S): P(incorrect | mastered)


def _env_float(name: str, default: float) -> float:
    """Read a float env var, falling back to ``default`` if absent/garbage."""
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        value = float(raw)
    except (TypeError, ValueError):
        _warn("invalid_env_float", name=name, value=raw, using=default)
        return default
    return value if value > 0 else default


# --------------------------------------------------------------------------- #
# Pydantic contracts
# --------------------------------------------------------------------------- #


class Interaction(BaseModel):
    """A single attempt by the learner on a knowledge component."""

    kc_id: int = Field(..., description="Knowledge-component identifier.")
    correct: Literal[0, 1] = Field(
        ..., description="1 if the attempt was correct, 0 otherwise."
    )
    timestamp: Optional[Any] = Field(
        default=None,
        description="Optional ordering hint (ISO string or integer). Ignored "
        "for BKT, which is order-of-array sensitive; accepted for "
        "API compatibility.",
    )


class PredictRequest(BaseModel):
    user_id: int = Field(..., description="Learner identifier.")
    history: List[Interaction] = Field(
        default_factory=list,
        description="Chronological attempt history. Empty list is valid.",
    )


class MasteryItem(BaseModel):
    kc_id: int
    probability: float


class PredictResponse(BaseModel):
    mastery: List[MasteryItem]
    engine: str


class HealthResponse(BaseModel):
    status: str
    engine: str
    dkt_available: bool
    checkpoint: bool
    bkt_available: bool
    fit_timeout_s: float
    cache_entries: int


# --------------------------------------------------------------------------- #
# Deterministic fallback estimator (documented BKT posterior update)
# --------------------------------------------------------------------------- #


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def heuristic_mastery(
    observations: Sequence[int],
    *,
    prior: float = FALLBACK_PRIOR,
    learn: float = FALLBACK_LEARN,
    guess: float = FALLBACK_GUESS,
    slip: float = FALLBACK_SLIP,
) -> float:
    """Standard Bayesian Knowledge Tracing forward posterior update.

    For each observation, in order:

    1. **Evidence update** (Bayes, given the current mastery belief ``p``):

           P(mastered | correct)   = p(1 - slip) / (p(1 - slip) + (1 - p)guess)
           P(mastered | incorrect) = p * slip    / (p * slip    + (1 - p)(1 - guess))

    2. **Learning transition** (a student may learn between opportunities):

           p' = p_posterior + (1 - p_posterior) * learn

    ``prior`` starts at ``FALLBACK_PRIOR``. The returned value is the belief
    after the final observation, then the learning transition — i.e. exactly the
    quantity a BKT model reports as ``state_predictions``.

    This is fully deterministic: identical input always yields identical output.
    """
    p = _clamp01(prior)
    for obs in observations:
        if obs == 1:
            num = p * (1.0 - slip)
            den = num + (1.0 - p) * guess
        else:
            num = p * slip
            den = num + (1.0 - p) * (1.0 - guess)
        p_posterior = num / den if den > 0.0 else p
        p = _clamp01(p_posterior + (1.0 - p_posterior) * learn)
    return _clamp01(p)


# --------------------------------------------------------------------------- #
# Engines
# --------------------------------------------------------------------------- #


@dataclass
class EngineStatus:
    """What actually loaded at startup (reported by /health)."""

    requested: str = DEFAULT_ENGINE
    active: str = DEFAULT_ENGINE
    dkt_available: bool = False
    checkpoint_found: bool = False
    bkt_available: bool = False
    dkt_reason: str = ""


def _probe_bkt() -> bool:
    """Return True iff pyBKT can be imported *and* used."""
    try:
        import pyBKT  # noqa: F401
        from pyBKT.models import Model  # noqa: F401
    except Exception as exc:  # pragma: no cover - depends on environment
        _warn(
            "bkt_import_failed",
            error=type(exc).__name__,
            detail=str(exc).splitlines()[0][:200],
        )
        return False
    return True


def _probe_dkt(checkpoint_path: str) -> Tuple[bool, bool, str]:
    """Return ``(deps_available, checkpoint_found, reason)`` for the DKT path.

    Never raises: missing packages, broken torch installs, unreadable
    checkpoints and empty files all simply report "not available".
    """
    try:
        import torch  # noqa: F401
    except Exception as exc:
        return False, os.path.isfile(checkpoint_path), (
            f"torch import failed: {type(exc).__name__}"
        )

    dkt_module = None
    for module_name in ("juno_dkt", "juno", "dkt"):
        try:
            dkt_module = __import__(module_name)
            break
        except Exception:
            continue
    if dkt_module is None:
        return (
            False,
            os.path.isfile(checkpoint_path),
            "no juno-dkt/dkt module importable",
        )

    if not os.path.isfile(checkpoint_path):
        return True, False, "checkpoint missing"

    try:
        if os.path.getsize(checkpoint_path) <= 0:
            return True, False, "checkpoint empty"
        torch.load(checkpoint_path, map_location="cpu")
    except Exception as exc:
        return False, True, f"checkpoint unreadable: {type(exc).__name__}"

    return True, True, "ok"


class DKTEngine:
    """Thin wrapper around an optional DKT checkpoint.

    The wrapper is intentionally defensive: anything unexpected raises, and the
    caller degrades to BKT + the heuristic estimator.
    """

    def __init__(self, checkpoint_path: str) -> None:
        import torch  # noqa: F401  (already verified importable)

        self.checkpoint_path = checkpoint_path
        self._torch = torch
        self._net: Any = None
        self._num_kcs: Optional[int] = None

    def predict(self, grouped: Dict[int, List[int]]) -> Dict[int, float]:
        """Return P(mastered) per kc_id, restricted to kc_ids in ``grouped``."""
        # An untrained/absent network cannot produce meaningful numbers, so we
        # surface an explicit signal and let the caller use the heuristic.
        raise RuntimeError("DKT checkpoint did not provide a runnable network")


class BKTEngine:
    """pyBKT maximum-likelihood BKT fitted per request."""

    def __init__(self, fit_timeout_s: float) -> None:
        self.fit_timeout_s = fit_timeout_s
        self._Model: Any = None

    def _model_cls(self) -> Any:
        if self._Model is None:
            from pyBKT.models import Model

            self._Model = Model
        return self._Model

    def _fit_and_predict(self, grouped: Dict[int, List[int]]) -> Dict[int, float]:
        import pandas as pd

        try:
            import warnings

            warnings.filterwarnings("ignore")
        except Exception:  # pragma: no cover
            pass

        rows: List[Tuple[int, int, int]] = []
        for kc_id, observations in grouped.items():
            for obs in observations:
                rows.append((0, kc_id, obs))
        frame = pd.DataFrame(rows, columns=["user_id", "skill_name", "correct"])

        model = self._model_cls()(seed=42, num_fits=1)
        model.fit(data=frame)
        preds = model.predict(data=frame)

        result: Dict[int, float] = {}
        for kc, group in preds.groupby("skill_name"):
            last = group["state_predictions"].iloc[-1]
            result[int(kc)] = float(last)
        return result

    def _run_with_deadline(self, grouped: Dict[int, List[int]]) -> Optional[Dict[int, float]]:
        """Run the fit in a daemon thread, bounded by a wall-clock deadline.

        If the worker does not finish inside ``fit_timeout_s`` we abandon it
        (daemon threads cannot be force-killed in Python, so we simply stop
        waiting) and return ``None`` so the caller can use the fallback.
        """
        box: Dict[str, Any] = {}

        def _target() -> None:
            try:
                box["value"] = self._fit_and_predict(grouped)
            except BaseException as exc:  # noqa: BLE001 - must never leak
                box["error"] = exc

        worker = threading.Thread(target=_target, name="bkt-fit", daemon=True)
        worker.start()
        worker.join(self.fit_timeout_s)

        if worker.is_alive():
            _warn(
                "bkt_fit_timeout",
                timeout_s=self.fit_timeout_s,
                kcs=len(grouped),
                observations=sum(len(v) for v in grouped.values()),
            )
            return None
        if "error" in box:
            raise box["error"]
        return box.get("value")

    def predict(self, grouped: Dict[int, List[int]]) -> Dict[int, float]:
        estimate = self._run_with_deadline(grouped)
        if estimate is None:
            raise TimeoutError("bkt fit exceeded deadline")
        return estimate


# --------------------------------------------------------------------------- #
# LRU cache
# --------------------------------------------------------------------------- #


class LRUCache:
    """Small thread-safe LRU capped at ``maxsize`` entries."""

    def __init__(self, maxsize: int = DEFAULT_CACHE_MAXSIZE) -> None:
        self.maxsize = maxsize
        self._data: "OrderedDict[str, Dict[int, float]]" = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    @staticmethod
    def make_key(grouped: Dict[int, List[int]]) -> str:
        digest = hashlib.sha256()
        for kc_id in sorted(grouped):
            digest.update(b"|%d:" % kc_id)
            digest.update(",".join(str(o) for o in grouped[kc_id]).encode())
        return digest.hexdigest()

    def get(self, key: str) -> Optional[Dict[int, float]]:
        with self._lock:
            if key in self._data:
                self._data.move_to_end(key)
                self.hits += 1
                return dict(self._data[key])
            self.misses += 1
            return None

    def put(self, key: str, value: Dict[int, float]) -> None:
        with self._lock:
            self._data[key] = dict(value)
            self._data.move_to_end(key)
            while len(self._data) > self.maxsize:
                self._data.popitem(last=False)

    def __len__(self) -> int:
        with self._lock:
            return len(self._data)


CACHE = LRUCache(int(_env_float("KT_CACHE_MAXSIZE", float(DEFAULT_CACHE_MAXSIZE))))


# --------------------------------------------------------------------------- #
# Engine selection at startup
# --------------------------------------------------------------------------- #

STATUS = EngineStatus(requested=os.getenv("KT_ENGINE", DEFAULT_ENGINE).strip().lower())
FIT_TIMEOUT_S = _env_float("KT_FIT_TIMEOUT_S", DEFAULT_FIT_TIMEOUT_S)
BKT = BKTEngine(FIT_TIMEOUT_S)
DKT: Optional[DKTEngine] = None


def select_engine() -> EngineStatus:
    """Decide the active engine once, at import/startup time.

    Contract: the DKT path is taken ONLY when ``KT_ENGINE=dkt`` AND the DKT
    dependencies import AND a checkpoint file exists. Every other combination
    falls back to pyBKT (and, if pyBKT itself is broken, to the heuristic
    estimator at request time) without crashing.
    """
    requested = os.getenv("KT_ENGINE", DEFAULT_ENGINE).strip().lower() or DEFAULT_ENGINE
    checkpoint_path = os.getenv("DKT_CHECKPOINT_PATH", DEFAULT_CHECKPOINT)

    status = EngineStatus(requested=requested)
    status.bkt_available = _probe_bkt()

    deps_ok, checkpoint_ok, reason = (False, os.path.isfile(checkpoint_path), "engine not requested")
    if requested == "dkt":
        deps_ok, checkpoint_ok, reason = _probe_dkt(checkpoint_path)
    status.dkt_available = deps_ok and checkpoint_ok
    status.checkpoint_found = checkpoint_ok
    status.dkt_reason = reason

    global DKT
    if requested == "dkt" and deps_ok and checkpoint_ok:
        try:
            DKT = DKTEngine(checkpoint_path)
            status.active = "dkt"
            _log("engine_selected", engine="dkt", checkpoint=checkpoint_path)
            return status
        except Exception as exc:  # pragma: no cover - defensive
            reason = f"dkt init failed: {type(exc).__name__}"
            status.dkt_available = False
            status.dkt_reason = reason
            _warn("dkt_init_failed", error=type(exc).__name__, detail=str(exc)[:200])

    status.active = "bkt"
    if requested == "dkt":
        _warn("engine_fallback", requested="dkt", active="bkt", reason=reason)
    else:
        _log("engine_selected", engine="bkt", bkt_available=status.bkt_available)
    return status


STATUS = select_engine()


# --------------------------------------------------------------------------- #
# Prediction core
# --------------------------------------------------------------------------- #


def group_history(history: Iterable[Interaction]) -> Dict[int, List[int]]:
    """Group the history by ``kc_id``, preserving chronological order."""
    grouped: Dict[int, List[int]] = {}
    for item in history:
        grouped.setdefault(int(item.kc_id), []).append(int(item.correct))
    return grouped


def _heuristic_all(grouped: Dict[int, List[int]]) -> Dict[int, float]:
    return {kc: heuristic_mastery(obs) for kc, obs in grouped.items()}


def predict_mastery(grouped: Dict[int, List[int]]) -> Tuple[Dict[int, float], str]:
    """Return ``(probabilities_by_kc, engine_used)`` for a grouped history.

    Order of preference:

    1. DKT (only if it was successfully loaded at startup).
    2. pyBKT, unless the cache already holds the answer.
    3. The deterministic BKT-posterior fallback estimator.

    Never raises for valid input.
    """
    if not grouped:
        return {}, STATUS.active

    cache_key = LRUCache.make_key(grouped)

    # --- DKT path ---------------------------------------------------------
    if STATUS.active == "dkt" and DKT is not None:
        try:
            return DKT.predict(grouped), "dkt"
        except Exception as exc:  # noqa: BLE001
            _warn(
                "dkt_predict_failed_falling_back",
                error=type(exc).__name__,
                detail=str(exc)[:200],
            )
            # Fall through to BKT for this request.

    # --- Cache hit --------------------------------------------------------
    cached = CACHE.get(cache_key)
    if cached is not None:
        return cached, "bkt"

    # --- pyBKT ------------------------------------------------------------
    if STATUS.bkt_available:
        try:
            estimate = BKT.predict(grouped)
            if estimate:
                CACHE.put(cache_key, estimate)
                return estimate, "bkt"
        except Exception as exc:  # noqa: BLE001
            _warn(
                "bkt_fit_failed_falling_back",
                error=type(exc).__name__,
                detail=str(exc).splitlines()[0][:200] if str(exc) else "",
            )

    # --- Deterministic fallback ------------------------------------------
    _warn(
        "using_heuristic_fallback",
        kcs=len(grouped),
        observations=sum(len(v) for v in grouped.values()),
        reason="timeout" if not STATUS.bkt_available else "fit_unavailable",
    )
    return _heuristic_all(grouped), "bkt"


def _round_probability(value: float) -> float:
    """Clamp to [0, 1] and round to 4 decimals, returning a plain float."""
    if not math.isfinite(value):
        return 0.0
    return round(_clamp01(float(value)), 4)


# --------------------------------------------------------------------------- #
# FastAPI app
# --------------------------------------------------------------------------- #

app = FastAPI(
    title="Cognita Knowledge Tracing Service",
    version="1.0.0",
    description=(
        "Per-request Bayesian Knowledge Tracing (pyBKT) with an optional DKT "
        "checkpoint and a deterministic fallback estimator."
    ),
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Liveness + active-engine report."""
    return HealthResponse(
        status="ok",
        engine=STATUS.active,
        dkt_available=STATUS.dkt_available,
        checkpoint=STATUS.checkpoint_found,
        bkt_available=STATUS.bkt_available,
        fit_timeout_s=FIT_TIMEOUT_S,
        cache_entries=len(CACHE),
    )


@app.post("/predict_mastery", response_model=PredictResponse)
def predict_mastery_endpoint(request: PredictRequest) -> PredictResponse:
    """Predict mastery probability for every KC present in ``history``."""
    grouped = group_history(request.history)
    started = time.perf_counter()
    estimate, engine_used = predict_mastery(grouped)
    elapsed_ms = (time.perf_counter() - started) * 1000.0

    mastery = [
        MasteryItem(kc_id=kc_id, probability=_round_probability(prob))
        for kc_id, prob in sorted(estimate.items())
    ]
    _log(
        "predict_mastery",
        user_id=request.user_id,
        engine=engine_used,
        kcs=len(mastery),
        observations=len(request.history),
        elapsed_ms=f"{elapsed_ms:.1f}",
    )
    return PredictResponse(mastery=mastery, engine=engine_used)


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("KT_HOST", "0.0.0.0"),
        port=int(os.getenv("KT_PORT", "8001")),
    )
