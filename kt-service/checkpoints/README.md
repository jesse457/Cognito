# DKT checkpoint directory

**The DKT checkpoint is optional and must never be committed.**

This directory is a placeholder so the service can be configured with a
checkpoint path that does not exist yet. The Knowledge Tracing service runs
entirely on pyBKT without it.

## Enabling the DKT path

Drop a checkpoint at `./checkpoints/dkt.pt` (or point `DKT_CHECKPOINT_PATH` at
it) and install the optional dependencies:

```bash
pip install torch juno-dkt
KT_ENGINE=dkt uvicorn main:app --port 8001
```

All three conditions must hold for DKT to be selected:

1. `KT_ENGINE=dkt`
2. the DKT dependencies import (`torch` + a `juno_dkt` / `dkt` module)
3. the checkpoint file exists and loads

If any condition fails, the service logs a structured warning and answers with
`engine: "bkt"` — it never crashes and never returns a 500 for this reason.

`.gitignore` excludes everything in this directory except this `.gitkeep`.
