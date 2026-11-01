# Cognita Knowledge-Tracing Service

A single-file FastAPI microservice that predicts per-knowledge-component mastery
probabilities from a learner's answer history. It is the only external service the
Laravel backend calls for knowledge tracing.

| Engine | When it runs | Cost |
| :--- | :--- | :--- |
| **BKT** (`bkt`, default) | always available; fitted per request with `num_fits=1, seed=42` | ~0.1–1 s CPU for a small history, 18 ms on a cache hit |
| **DKT** (`dkt`, opt-in) | only when `KT_ENGINE=dkt` **and** the DKT deps import **and** a checkpoint exists | GPU |

The service **never crashes because DKT is missing**: `KT_ENGINE=dkt` without the
optional dependencies or checkpoint answers `engine: "bkt"` with HTTP 200.

---

## Endpoints

### `GET /health`

```bash
curl -s localhost:8001/health
```

```json
{"status":"ok","engine":"bkt","dkt_available":false,"checkpoint":false,"bkt_available":true,"fit_timeout_s":10.0,"cache_entries":0}
```

`status` and `engine` are the contract; the remaining keys are diagnostics.

### `POST /predict_mastery`

Request:

```json
{
  "user_id": 1,
  "history": [
    {"kc_id": 1, "correct": 1, "timestamp": "2026-10-19T12:00:00Z"},
    {"kc_id": 1, "correct": 0},
    {"kc_id": 2, "correct": 1}
  ]
}
```

`timestamp` is optional. Response:

```json
{"mastery": [{"kc_id": 1, "probability": 0.6125}, {"kc_id": 2, "probability": 0.2161}], "engine": "bkt"}
```

```bash
curl -s -X POST localhost:8001/predict_mastery \
  -H 'Content-Type: application/json' \
  -d '{"user_id":1,"history":[{"kc_id":1,"correct":1},{"kc_id":1,"correct":0},{"kc_id":2,"correct":1}]}'
```

Measured on this machine (CPU): **275 ms** first call, **18 ms** on an identical repeat
(in-process LRU cache). The acceptance budget is ~5 s.

Edge cases: empty history → `{"mastery": [], "engine": "bkt"}` with 200; a KC with one
observation, all-correct/all-incorrect histories and repeated timestamps all return
bounded probabilities; malformed bodies are rejected with 422 (never a 500).

---

## Environment variables

| Variable | Default | Meaning |
| :--- | :--- | :--- |
| `KT_ENGINE` | `bkt` | `bkt` or `dkt`. Unknown values fall back to `bkt`. |
| `DKT_CHECKPOINT_PATH` | `./checkpoints/dkt.pt` | Optional DKT checkpoint; never committed. |
| `KT_FIT_TIMEOUT_S` | `10` | Wall-clock cap on a pyBKT fit; on timeout the service answers with the documented fallback estimator. |
| `KT_LOG_LEVEL` | `INFO` | Structured log level. |

---

## Run natively

```bash
cd kt-service
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8001
```

`requirements.txt` pins `pyBKT==1.4.3`, `numpy==1.26.4`, `scikit-learn==1.5.2` and
`scipy<1.14` because pyBKT 1.0.x ships no `models` package on the PyPI sdist and later
numpy/scikit-learn releases break its EM fitter at import time. These pins are the
reason `pyBKT==1.0.*` from the brief is not used verbatim — the working behaviour
(CPU pyBKT fit, `num_fits=1`, `seed=42`, per-request) is preserved.

## Run in Docker

```bash
# repo root
docker compose --profile kt up -d kt-service     # builds ./kt-service, exposes 8001
docker compose --profile kt logs -f kt-service
```

The service binds `127.0.0.1:8001` by default. **On this machine port 8001 was already
occupied by an unrelated project's PHP server**, so the acceptance run used
`--port 8011` plus `KT_SERVICE_URL=http://127.0.0.1:8011` on the Laravel side. In a clean
environment the documented default (`8001`) works unchanged; the compose mapping is
`8001:8001`.

---

## Fallback behaviour (graceful degradation)

1. **Missing DKT artifacts** → `PYBKT` path, `engine: "bkt"`, warning logged once at startup.
2. **pyBKT fit error** → deterministic four-parameter BKT posterior estimator
   (prior 0.10, learn 0.15, guess 0.20, slip 0.10), `engine: "bkt"`, warning logged.
3. **pyBKT fit exceeds `KT_FIT_TIMEOUT_S`** → same fallback estimator; the request still
   answers 200.
4. **Laravel side**: if this service is unreachable or returns non-2xx, `UpdateStudentMastery`
   logs `kt.service_unavailable_falling_back_to_bkt` and computes BKT locally
   (`App\Services\KnowledgeTracing\BktEstimator`). A KT outage never blocks a student quiz.

`student_kc_mastery.model_used` records which engine produced each probability (`bkt`/`dkt`),
so you can audit the switchover per row.

---

## Tests

```bash
.venv/bin/python -m pytest test_service.py -q     # 13 tests
.venv/bin/python test_service.py                  # plain-python fallback
```

Covers: health shape, small/empty/mixed histories, single-observation KCs, all-correct and
all-incorrect sequences, many KCs, cache consistency, timeout fallback, malformed bodies, and
the `KT_ENGINE=dkt`-without-deps degradation (run in a clean subprocess so startup env vars apply).

---

## Why BKT is the default

BKT is a four-parameter Hidden Markov model (prior, learn, guess, slip) fitted with EM.
`pyBKT` fits a standard configuration in well under a second for typical student histories on
CPU, needs no GPU, and is stable across containers. BKT+F variants are competitive with DKT on
several public datasets; DKT (recurrent/attention models) is the opt-in upgrade for GPU
environments and is wired through the same endpoint and the same string column, so switching
engines requires no schema or Laravel code change.
