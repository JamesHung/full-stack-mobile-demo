---
name: mobile-environment-doctor
description: Diagnose mobile development environment drift for Expo, React Native, or Maestro workflows by scanning repo preflight scripts and toolchain manifests, then verifying the local machine against those expectations. Use when Codex needs to confirm or debug Android or iOS SDK setup, `pnpm` or Corepack shims, `uv` or Python virtualenv state, missing bootstrap artifacts, or version mismatches before build, simulator, emulator, or mobile smoke work.
---

# Mobile Environment Doctor

## Overview

Use the bundled doctor script to turn repo configuration into concrete environment checks. Prefer the script over ad-hoc shell probing so the diagnosis stays aligned with `preflight.sh`, `package.json`, and `pyproject.toml`.

## Quick Start

Run the doctor from the repo root:

```bash
python3 skills/mobile-environment-doctor/scripts/mobile_environment_doctor.py --repo .
```

Limit the diagnosis to one platform when the failure is specific:

```bash
python3 skills/mobile-environment-doctor/scripts/mobile_environment_doctor.py --repo . --platform android
python3 skills/mobile-environment-doctor/scripts/mobile_environment_doctor.py --repo . --platform ios
```

Use JSON output when another agent or script needs structured results:

```bash
python3 skills/mobile-environment-doctor/scripts/mobile_environment_doctor.py --repo . --json
```

## Workflow

1. Discover the source of truth.
   - Prefer repo `preflight.sh` files for required commands, bootstrap directories, and platform-specific checks.
   - Read `package.json` for the package manager pin.
   - Read backend `pyproject.toml` for `requires-python`.
   - Read `AGENTS.md` only as a documented baseline when it states a stricter version than the manifests.

2. Run the doctor before deeper debugging.
   - Start with `--platform all`.
   - Re-run with a narrower platform after the first pass if only Android or only iOS is broken.

3. Fix failures in source-of-truth order.
   - Missing bootstrap artifacts such as `node_modules` or `backend/.venv` come before simulator or emulator checks.
   - Exact package-manager drift comes before application-level build failures.
   - Treat a booted-device absence as readiness work, not as a package-install problem.

4. Re-run the repo's real entrypoint after the doctor passes.
   - Use the repo's existing `make`, `pnpm`, `uv`, or Maestro commands instead of inventing replacements.

## Interpretation Rules

- Trust `preflight.sh` over memory when it explicitly requires a command or directory.
- Treat `package.json#packageManager` as an exact package-manager pin.
- Treat `pyproject.toml` `requires-python` as the machine-readable minimum; if `AGENTS.md` documents a stricter Python minor line, report that as drift.
- Treat PATH-only problems separately from missing installations when the repo preflight already bootstraps SDK or Maestro directories.

For the detection order and severity rules used by the script, read `references/detection-order.md`.

## Resources

- `scripts/mobile_environment_doctor.py`: Scan repo signals, inspect the local toolchain, and emit fail or warn remediation.
- `references/detection-order.md`: Explain which files the doctor trusts first and how to extend the heuristics.
