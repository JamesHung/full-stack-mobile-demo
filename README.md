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

## Local Mobile Smoke

Repo-root smoke entry points now auto-start the backend API, worker, and Expo dev server before installing and exercising the native app on a booted simulator or emulator:

```bash
make maestro-android-local
```

`make maestro-ios-local` is currently tracked as a known issue while the iOS native build/codegen drift is diagnosed. See `issuelog/2026-03-23-ios-smoke-reactcodegen-missing-componentdescriptors.md`.

Expected local prerequisites:

- `corepack pnpm install` and `uv sync --directory backend` have already been run
- `maestro`, `java`, and the target Android emulator are already available
- the target Android emulator is already booted before invoking the command

Each Android run writes evidence under `.artifacts/maestro/local/android-<run-id>/`, including:

- `<platform>.junit.xml`
- `maestro-output/`
- `debug/`
- `logs/api.log`
- `logs/worker.log`
- `logs/metro.log`
- `logs/build-install.log`
- `logs/maestro.log`
- `summary.txt`

The canonical flow keeps the seeded demo account and sample upload, but generates a unique failing note title per run so retries do not collide with older data.

## CI Mobile Smoke

GitHub Actions now defines `.github/workflows/mobile-smoke.yml` with an `android-smoke` job.

The workflow auto-runs on smoke-relevant changes only:

- `app/**`
- `backend/**`
- `packages/shared/**`
- `.maestro/**`
- `scripts/maestro/**`
- `.github/workflows/**`
- `Makefile`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `backend/pyproject.toml`
- `backend/uv.lock`
- `app/app.json`

The workflow uploads this Android artifact bundle:

- `voice-notes-smoke-android`

iOS smoke remains a known issue and is intentionally excluded from CI until the native codegen failure is resolved.

Provisioning failures are treated as hard failures for the Android job; they do not downgrade to warnings.

## Failure Triage

Runner output classifies failures into these stages:

- `preflight`: missing toolchain, missing dependencies, or no booted device
- `service-bootstrap`: API, worker, or Metro failed before smoke execution started
- `build-install`: Expo native build or install failed
- `maestro`: the app journey itself failed

When a smoke run fails, start with `summary.txt`, then inspect the stage-specific logs in `logs/`, and finally review the screenshots and command metadata inside `maestro-output/` and `debug/`.
