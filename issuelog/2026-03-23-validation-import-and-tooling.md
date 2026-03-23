# 2026-03-23 Validation Import And Tooling

## Issue 1: Backend `pytest` could not import the app package

### Problem Analysis

Running `uv run --directory backend pytest --cov=backend/src --cov-report=term-missing`
failed before test execution. `backend/tests/conftest.py` imports
`backend.src.main`, but pytest only added the `backend/` directory to
`sys.path`, so the repository root package name `backend` was not resolvable.

### Root Cause

`backend/pyproject.toml` configured `pythonpath = ["."]` only, which omits the
repository root that contains the top-level `backend` package name used by the
codebase imports.

### Resolution

Updated `backend/pyproject.toml` to use `pythonpath = ["..", "."]` so both the
repo root and backend package directory are available during test runs.

## Issue 2: `pnpm` shim was unavailable in the current shell session

### Problem Analysis

Running `pnpm lint`, `pnpm test`, and `pnpm build` failed with `command not
found: pnpm`, which blocked TypeScript regression validation even though Node
and Corepack were installed.

### Root Cause

This shell session did not have the `pnpm` shim activated on `PATH`, but
`corepack` was available and already configured for the repo's requested PNPM
version.

### Resolution

Used `corepack pnpm ...` for JavaScript dependency installation and regression
commands in this turn. This preserves the repo's intended package-manager
version without changing application code.
