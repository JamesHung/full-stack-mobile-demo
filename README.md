# Voice Notes Summary

Cross-platform Expo client plus FastAPI backend for creating voice notes, tracking async processing, and reviewing transcript/summary results.

## Bootstrap

```bash
corepack pnpm install
uv sync --directory backend
```

## Run

```bash
corepack pnpm --filter app start
uv run --directory backend fastapi dev backend/src/main.py
uv run --directory backend python -m backend.src.workers.notes
```

## Validate

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
uv run --directory backend pytest --cov=backend.src --cov-report=term-missing
```
