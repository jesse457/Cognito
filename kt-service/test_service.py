"""Tests for the Cognita Knowledge Tracing service.

Run either way:

    .venv/bin/python -m pytest test_service.py -v     # pytest
    .venv/bin/python test_service.py                  # plain python

The suite is deliberately black-box: it drives the FastAPI app through
``fastapi.testclient`` exactly as a caller would, and re-imports ``main`` in a
clean subprocess for the environment-dependent cases (so ``KT_ENGINE`` and
``DKT_CHECKPOINT_PATH`` changes take effect at startup).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

SERVICE_DIR = Path(__file__).resolve().parent
MAIN_PY = SERVICE_DIR / "main.py"

PREDICT_BODY = {
    "user_id": 1,
    "history": [
        {"kc_id": 1, "correct": 1},
        {"kc_id": 1, "correct": 0},
        {"kc_id": 2, "correct": 1},
    ],
}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _client() -> TestClient:
    """Import main fresh and return a TestClient."""
    if str(SERVICE_DIR) not in sys.path:
        sys.path.insert(0, str(SERVICE_DIR))
    import main

    return TestClient(main.app)


def _run_in_subprocess(env: dict[str, str], snippet: str) -> dict:
    """Run a snippet with main imported in a clean interpreter.

    Returns the parsed JSON object printed by the snippet. This is how we vary
    startup env vars, because main.py reads them at import time.
    """
    full_env = dict(os.environ)
    full_env.update(env)

    proc = subprocess.run(
        [sys.executable, "-c", snippet],
        cwd=str(SERVICE_DIR),
        env=full_env,
        capture_output=True,
        text=True,
        timeout=300,
    )
    assert proc.returncode == 0, (
        f"subprocess failed (rc={proc.returncode})\n"
        f"stdout:\n{proc.stdout}\nstderr:\n{proc.stderr}"
    )
    out = proc.stdout.strip().splitlines()
    assert out, f"subprocess produced no output\nstderr:\n{proc.stderr}"
    return json.loads(out[-1])


# --------------------------------------------------------------------------- #
# Required assertions
# --------------------------------------------------------------------------- #


def test_health_returns_engine_bkt() -> None:
    """GET /health -> 200 with status ok and engine bkt."""
    client = _client()
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["engine"] == "bkt"


def test_health_reports_engine_keys() -> None:
    """The health payload carries the dkt deps / checkpoint flags."""
    client = _client()
    body = client.get("/health").json()
    for key in ("status", "engine", "dkt_available", "checkpoint"):
        assert key in body, f"missing health key {key}"
    assert isinstance(body["dkt_available"], bool)
    assert isinstance(body["checkpoint"], bool)


def test_predict_mastery_small_history() -> None:
    """All requested kc_ids come back with probabilities inside [0, 1]."""
    client = _client()
    response = client.post("/predict_mastery", json=PREDICT_BODY)
    assert response.status_code == 200
    body = response.json()

    assert body["engine"] == "bkt"
    assert isinstance(body["mastery"], list)

    requested = {item["kc_id"] for item in PREDICT_BODY["history"]}
    returned = {item["kc_id"] for item in body["mastery"]}
    assert requested == returned, f"expected {requested}, got {returned}"

    for item in body["mastery"]:
        assert isinstance(item["kc_id"], int)
        probability = item["probability"]
        assert isinstance(probability, float), "probability must be a JSON float"
        assert 0.0 <= probability <= 1.0, f"probability out of range: {probability}"
        # Rounded to at most 4 decimals.
        assert round(probability, 4) == probability


def test_predict_mastery_empty_history() -> None:
    """Empty history -> mastery: [] and HTTP 200."""
    client = _client()
    response = client.post("/predict_mastery", json={"user_id": 1, "history": []})
    assert response.status_code == 200
    body = response.json()
    assert body["mastery"] == []
    assert body["engine"] == "bkt"


def test_dkt_engine_without_deps_falls_back_to_bkt() -> None:
    """KT_ENGINE=dkt, no DKT deps/checkpoint -> engine == "bkt", HTTP 200."""
    snippet = (
        "import json, main\n"
        "from fastapi.testclient import TestClient\n"
        "c = TestClient(main.app)\n"
        "h = c.get('/health').json()\n"
        "p = c.post('/predict_mastery', json=" + json.dumps(PREDICT_BODY) + ")\n"
        "print(json.dumps({'health': h, 'status': p.status_code, 'body': p.json()}))\n"
    )
    result = _run_in_subprocess(
        {
            "KT_ENGINE": "dkt",
            "DKT_CHECKPOINT_PATH": "./checkpoints/definitely-absent.pt",
        },
        snippet,
    )

    assert result["health"]["engine"] == "bkt", result["health"]
    assert result["health"]["dkt_available"] is False, result["health"]
    assert result["status"] == 200
    assert result["body"]["engine"] == "bkt"


# --------------------------------------------------------------------------- #
# Robustness / edge cases
# --------------------------------------------------------------------------- #


def test_single_observation_kc() -> None:
    """A KC with exactly one observation is still predicted."""
    client = _client()
    body = client.post(
        "/predict_mastery",
        json={"user_id": 2, "history": [{"kc_id": 42, "correct": 1}]},
    ).json()
    assert [m["kc_id"] for m in body["mastery"]] == [42]
    assert 0.0 <= body["mastery"][0]["probability"] <= 1.0


def test_all_correct_and_all_incorrect() -> None:
    """All-correct and all-incorrect histories stay in range and make sense."""
    client = _client()
    all_correct = client.post(
        "/predict_mastery",
        json={"user_id": 3, "history": [{"kc_id": 1, "correct": 1}] * 5},
    ).json()
    all_incorrect = client.post(
        "/predict_mastery",
        json={"user_id": 4, "history": [{"kc_id": 1, "correct": 0}] * 5},
    ).json()

    correct_p = all_correct["mastery"][0]["probability"]
    incorrect_p = all_incorrect["mastery"][0]["probability"]
    assert 0.0 <= correct_p <= 1.0
    assert 0.0 <= incorrect_p <= 1.0
    assert correct_p > incorrect_p, "all-correct should exceed all-incorrect"


def test_repeated_and_mixed_timestamps() -> None:
    """Repeated / integer / missing timestamps are accepted."""
    client = _client()
    history = [
        {"kc_id": 1, "correct": 1, "timestamp": "2024-01-01T00:00:00Z"},
        {"kc_id": 1, "correct": 0, "timestamp": "2024-01-01T00:00:00Z"},
        {"kc_id": 2, "correct": 1, "timestamp": 1700000000},
        {"kc_id": 2, "correct": 0, "timestamp": None},
    ]
    response = client.post("/predict_mastery", json={"user_id": 5, "history": history})
    assert response.status_code == 200
    body = response.json()
    assert {m["kc_id"] for m in body["mastery"]} == {1, 2}


def test_many_kcs() -> None:
    """A history covering many KCs returns one entry per KC, in range."""
    client = _client()
    history = [{"kc_id": kc, "correct": kc % 2} for kc in range(1, 11)]
    body = client.post(
        "/predict_mastery", json={"user_id": 6, "history": history}
    ).json()
    assert len(body["mastery"]) == 10
    assert all(0.0 <= m["probability"] <= 1.0 for m in body["mastery"])


def test_repeated_request_is_consistent() -> None:
    """The same history twice yields identical probabilities (cache is exact)."""
    client = _client()
    first = client.post("/predict_mastery", json=PREDICT_BODY).json()
    second = client.post("/predict_mastery", json=PREDICT_BODY).json()
    assert first == second


def test_heuristic_estimator_is_bounded_and_deterministic() -> None:
    """The documented fallback estimator is in range and deterministic."""
    if str(SERVICE_DIR) not in sys.path:
        sys.path.insert(0, str(SERVICE_DIR))
    import main

    histories = [[], [1], [0], [1, 0], [1, 1, 1], [0, 0, 0], [1, 0] * 40]
    for observations in histories:
        first = main.heuristic_mastery(observations)
        second = main.heuristic_mastery(observations)
        assert first == second, "estimator must be deterministic"
        assert 0.0 <= first <= 1.0, f"out of range for {observations}: {first}"

    # Monotone in evidence.
    assert main.heuristic_mastery([1]) > main.heuristic_mastery([0])
    assert main.heuristic_mastery([1, 1, 1]) > main.heuristic_mastery([1])


def test_timeout_guard_returns_fallback() -> None:
    """A fit that cannot finish inside KT_FIT_TIMEOUT_S answers, not hangs."""
    snippet = (
        "import json, main\n"
        "from fastapi.testclient import TestClient\n"
        "c = TestClient(main.app)\n"
        "p = c.post('/predict_mastery', json=" + json.dumps(PREDICT_BODY) + ")\n"
        "print(json.dumps({'status': p.status_code, 'body': p.json()}))\n"
    )
    result = _run_in_subprocess({"KT_FIT_TIMEOUT_S": "0.001"}, snippet)

    assert result["status"] == 200
    assert result["body"]["engine"] == "bkt"
    requested = {item["kc_id"] for item in PREDICT_BODY["history"]}
    assert {m["kc_id"] for m in result["body"]["mastery"]} == requested


def test_invalid_body_is_rejected_not_crashing() -> None:
    """Malformed *input* is a clean 422, never a 500."""
    client = _client()
    # `correct` outside the documented 0|1 domain.
    bad = client.post(
        "/predict_mastery",
        json={"user_id": 1, "history": [{"kc_id": 1, "correct": 7}]},
    )
    assert bad.status_code == 422

    # Missing required field.
    missing = client.post("/predict_mastery", json={"history": []})
    assert missing.status_code == 422


# --------------------------------------------------------------------------- #
# Plain-python runner
# --------------------------------------------------------------------------- #


def _main() -> int:
    tests = [
        (name, obj)
        for name, obj in sorted(globals().items())
        if name.startswith("test_") and callable(obj)
    ]
    failures = 0
    print(f"Running {len(tests)} tests from {__file__}\n")
    for name, test in tests:
        try:
            test()
        except Exception as exc:  # noqa: BLE001 - report and continue
            failures += 1
            print(f"FAIL  {name}: {type(exc).__name__}: {exc}")
        else:
            print(f"PASS  {name}")
    print(f"\n{len(tests) - failures} passed, {failures} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(_main())
