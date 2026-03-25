# 2026-03-24 uv sandbox import smoke blocker

## Problem analysis

While validating the repo toolchain, `uv run --directory backend python -c 'import backend.src.main, backend.src.workers.notes'` did not provide a stable backend import smoke in the Codex sandbox.

Two failures appeared during the same verification flow:

1. `uv` tried to initialize its cache under `~/.cache/uv` and hit a sandbox permission error.
2. Retrying with `UV_CACHE_DIR=/tmp/uv-cache` avoided the cache permission issue, but `uv` then panicked inside a macOS system-configuration call before the Python process started.

The repo import path itself also needs the same convention used by the repo scripts: `cd backend && PYTHONPATH=..`.

## Root cause

The blocker is environmental rather than a backend code regression:

- Codex sandbox restrictions prevented `uv` from opening its default cache path under `~/.cache/uv`.
- A follow-up `uv` invocation with a writable cache directory still crashed inside the sandboxed macOS runtime before reaching the repo code.
- The backend module path is intentionally repo-relative and requires `PYTHONPATH=..`, so a plain `uv run --directory backend ...` import smoke is incomplete even without the sandbox issue.

## Solution

Use the already-created repo virtualenv directly for sandbox-safe backend import validation:

```bash
cd backend && PYTHONPATH=.. .venv/bin/python -c 'import backend.src.main, backend.src.workers.notes; print("backend import ok")'
```

This verified the backend import path without depending on `uv` runtime behavior inside the sandbox.

If future validation must exercise `uv run` specifically, prefer one of these options:

- run with broader host permissions so `uv` can use its normal cache and system APIs
- validate repo imports separately from `uv` process startup when the sandbox is known to interfere
