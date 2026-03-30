---
name: mobile-smoke-scaffold
description: Scaffold a portable Mobile Smoke Test Kit for Expo/React Native + Node/Python Backend projects. Use when a user asks to "set up smoke tests", "add mobile smoke testing", "scaffold maestro tests", "add CI smoke pipeline", "bootstrap smoke kit", or similar requests involving mobile E2E smoke test infrastructure.
---

# Mobile Smoke Scaffold

## Overview

Automate the injection of a complete smoke test kit structure into a new or existing Expo / React Native project with a Node or Python backend. The skill drives `smoke-kit` CLI commands, verifies the generated output, and guides the user through customization.

## Quick Start

From the repo root:

```bash
# 1 — Initialize config (if missing)
npx smoke-kit init

# 2 — Scaffold templates
npx smoke-kit scaffold

# 3 — Verify
ls smoke.config.json maestro/ .github/workflows/smoke-*.yml scripts/run-smoke.sh
```

## Workflow

### Step 1 — Check for existing config

Look for `smoke.config.json` at the repo root.

- **If it exists**: read and validate it. Confirm `appId`, `platforms`, `services`, and `flows.directory` match the current project structure. Report any drift.
- **If it does not exist**: run `npx smoke-kit init`. The init command detects `app.json` / `app.config.ts`, backend directories, and generates a starter config. Review the generated file and confirm the detected values are correct.

### Step 2 — Scaffold templates

Run `npx smoke-kit scaffold` to inject:

- **Maestro flows** into the configured `flows.directory` (default: `maestro/`).
- **CI workflow** at `.github/workflows/smoke-android.yml` (and iOS variant if configured).
- **Run script** at `scripts/run-smoke.sh` for local execution.
- **Artifact directory** structure under the configured `artifacts.outputRoot` (default: `smoke-artifacts/`).

If files already exist, the scaffold command preserves user modifications and only adds missing files. Confirm this with the user before running if the project has prior smoke infrastructure.

### Step 3 — Verify the generated structure

After scaffolding, verify:

1. `smoke.config.json` is valid JSON and matches the `SmokeConfig` schema (see `packages/smoke-kit/src/config/types.ts`).
2. At least one Maestro flow file exists in `flows.directory`.
3. The CI workflow file references the correct `appId` and platforms.
4. The run script is executable and references the correct paths.
5. Service commands in `services[]` are valid (the binaries exist, ports are available).

```bash
# Quick structure check
cat smoke.config.json | python3 -m json.tool
ls -la "$(jq -r .flows.directory smoke.config.json)"
ls -la .github/workflows/smoke-*.yml
```

### Step 4 — Suggest customization points

After successful scaffolding, guide the user through key customization areas:

| Area | File | What to customize |
|------|------|-------------------|
| App identity | `smoke.config.json` → `appId` | Must match `app.json` `expo.android.package` / `expo.ios.bundleIdentifier` |
| Target platforms | `smoke.config.json` → `platforms` | Add or remove `"android"` / `"ios"` |
| Backend services | `smoke.config.json` → `services[]` | Add services with health check endpoints |
| Maestro flows | `flows.directory` | Add custom flows, adjust selectors and test data |
| CI triggers | `.github/workflows/smoke-*.yml` | Adjust branch filters, matrix, and artifact retention |
| Health check tuning | `smoke.config.json` → `healthCheck` | Adjust global timeout and retry defaults |
| Artifact output | `smoke.config.json` → `artifacts` | Change output root, JUnit filename, summary path |

## Common Scenarios

### Monorepo with `app/` subdirectory

```bash
npx smoke-kit init --app-root app
```

The generated config sets `appRoot: "app"` and resolves `app.json` from that subdirectory.

### Custom backend path

```bash
npx smoke-kit init --backend-root services/api
```

Generates a service entry pointing to the backend subdirectory with the detected start command.

### iOS-only or Android-only

Edit `smoke.config.json` after init:

```jsonc
{
  "platforms": ["ios"]  // or ["android"]
}
```

The scaffold command and CI workflow will only generate platform-specific files.

## Resources

- `references/config-reference.md`: Full field-by-field documentation of `smoke.config.json`.
- `packages/smoke-kit/src/config/types.ts`: Canonical TypeScript type definitions.
