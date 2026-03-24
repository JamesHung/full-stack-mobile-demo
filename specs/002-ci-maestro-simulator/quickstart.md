# Quickstart: CI Maestro Simulator Runs

## Goal

Validate the implemented feature from a clean checkout by running the existing regression suite plus the Android Maestro smoke path. iOS smoke is currently tracked as a known issue.

## Bootstrap

```bash
corepack pnpm install
uv sync --directory backend
```

## Android Local Smoke

After implementation, run:

```bash
make maestro-android-local
```

Expected outcome:

- Preflight verifies Java, Maestro CLI, Android emulator availability, and app buildability
- The command auto-starts the backend API and worker
- The command auto-starts the Expo dev server used by the development build
- The app is installed or refreshed for Android
- The canonical smoke flow runs with unique per-run note data and writes Android-specific evidence under the configured output root

## iOS Known Issue

iOS smoke is not part of the required regression gate right now. The current local run fails during native build with a missing ReactCodegen-generated file:

- `app/ios/build/generated/ios/react/renderer/components/rngesturehandler_codegen/ComponentDescriptors.cpp`

Track diagnosis and remediation in `issuelog/2026-03-23-ios-smoke-reactcodegen-missing-componentdescriptors.md`.

Default output directory:

- Android local: `.artifacts/maestro/local/android-<run-id>/`

## Optional Manual Debug Mode

If you need to inspect backend behavior outside the smoke wrapper, you may still run:

```bash
make api
make worker
```

This is only for debugging. The supported local smoke contract still requires the smoke command itself to auto-start the services.

## Regression Suite Before Finalization

Run the existing regression commands plus the Android smoke path:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
uv run --directory backend pytest --cov=backend.src --cov-report=term-missing
make maestro-android-local
```

If shared UI or reusable note components are changed while stabilizing the smoke flow, also run:

```bash
corepack pnpm storybook:build
```

## CI Expectation

Open the GitHub Actions workflow run and confirm:

- `android-smoke` appears as the required mobile smoke job
- The job uploads the Android evidence bundle
- Jobs only run when smoke-relevant paths change
- If the Android emulator cannot provision, the job fails instead of being downgraded to a warning

Failure triage order:

1. Open `summary.txt` to see the stage classification (`preflight`, `service-bootstrap`, `build-install`, or `maestro`)
2. Inspect `logs/api.log`, `logs/worker.log`, `logs/metro.log`, and `logs/build-install.log`
3. Review the screenshots and command metadata in `maestro-output/` and `debug/`
