# Quickstart: Mobile Smoke Test Kit

**Feature**: 004-mobile-smoke-kit

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 10
- Maestro CLI installed (`curl -Ls https://get.maestro.mobile.dev | bash`)
- For Android: booted emulator + `adb` + Java 17
- For iOS: macOS + Xcode + booted simulator

## 1. Install the Smoke Kit

The kit lives in the monorepo at `packages/smoke-kit/`. After cloning:

```bash
pnpm install
```

This installs all dependencies including the `smoke-kit` binary (symlinked via workspace).

## 2. Initialize Configuration

From the project root:

```bash
# Auto-detect project structure and generate smoke.config.json
pnpm smoke-kit init

# Or specify paths manually
pnpm smoke-kit init --app-root app --backend-root backend --app-id com.demo.voicenotes
```

This creates a `smoke.config.json` in the project root with detected values.

## 3. Scaffold Full Structure (New Projects)

For a new project that needs all smoke test files:

```bash
pnpm smoke-kit scaffold
```

This creates:
- `smoke.config.json` — configuration file
- `scripts/maestro/run-smoke.sh` — entry-point shim
- `.maestro/android-smoke.yaml` — Android Maestro wrapper
- `.maestro/ios-smoke.yaml` — iOS Maestro wrapper
- `.maestro/canonical-flow.yaml` — canonical flow skeleton
- `.github/workflows/mobile-smoke.yml` — CI workflow

## 4. Validate Prerequisites

Before running tests, verify everything is in place:

```bash
# Check all prerequisites for Android
pnpm smoke-kit preflight --platform android

# Check for iOS
pnpm smoke-kit preflight --platform ios
```

## 5. Run Smoke Tests Locally

```bash
# Run Android smoke tests
pnpm smoke-kit run android

# Run iOS smoke tests
pnpm smoke-kit run ios

# Run with verbose output
pnpm smoke-kit run android --verbose

# Skip backend startup (if backend is already running)
pnpm smoke-kit run android --skip-backend
```

## 6. Configure CI

In your repository's workflow file, call the reusable workflow:

```yaml
# .github/workflows/smoke-tests.yml
name: Smoke Tests
on:
  pull_request:
    paths: [app/**, backend/**, packages/**]

jobs:
  android:
    uses: ./.github/workflows/smoke-kit-reusable.yml
    with:
      platform: android
      timeout-minutes: 45

  ios:
    uses: ./.github/workflows/smoke-kit-reusable.yml
    with:
      platform: ios
      timeout-minutes: 60
```

## 7. Understand Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | General/unexpected error |
| 2 | Invalid configuration |
| 3 | Preflight check failed |
| 4 | Service startup failed |
| 5 | Health check timeout |
| 6 | Test execution failed |
| 7 | Cleanup warning |

## 8. Read Error Summaries

On failure, the CLI outputs a structured Error Summary:

```
═══════════════════════════════════════════════════
 SMOKE KIT — ERROR SUMMARY
═══════════════════════════════════════════════════
 Stage:      health-check
 Exit Code:  5
 Duration:   62.4s
 Service:    backend-api (port 8000)
───────────────────────────────────────────────────
 Last 50 lines of backend-api.log:

 [log content]

═══════════════════════════════════════════════════
```

In CI, the same summary appears in the GitHub Step Summary tab.

## Development Workflow

### Running unit tests

```bash
# Run all smoke-kit tests
pnpm vitest run --project smoke-kit

# Run with coverage
pnpm vitest run --project smoke-kit --coverage

# Watch mode during development
pnpm vitest --project smoke-kit
```

### Key source files

| File | Purpose |
|------|---------|
| `src/cli.ts` | CLI entry point (commander setup) |
| `src/config/schema.ts` | JSON Schema definition |
| `src/config/loader.ts` | Config loading + validation |
| `src/health/tcp-probe.ts` | TCP port probing |
| `src/health/http-probe.ts` | HTTP health check with retries |
| `src/logs/error-summary.ts` | Error summary formatting |
| `src/orchestrator/pipeline.ts` | Stage-based pipeline executor |
