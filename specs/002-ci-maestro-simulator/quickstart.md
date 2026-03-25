# Quickstart: CI Maestro Simulator Runs

## Goal

Validate the implemented feature from a clean checkout by running the existing regression suite plus the Android and iOS Maestro smoke paths.

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

## iOS Local Smoke

**Prerequisite**: The `newArchEnabled` fix (Priority 1 in plan.md) must be applied first. Verify `app/ios/Podfile.properties.json` has `"newArchEnabled": "true"`.

After implementation, run:

```bash
make maestro-ios-local
```

Expected outcome:

- Preflight verifies Xcode, Maestro CLI, iOS simulator availability, and app buildability
- The command auto-starts the backend API and worker
- The command auto-starts the Expo dev server used by the development build
- iOS native build follows FR-015 sequence: prebuild → pod install → codegen verify → build
- The app is installed on the iOS simulator
- The canonical smoke flow runs with unique per-run note data and writes iOS-specific evidence under the configured output root

If the iOS build fails with missing `ComponentDescriptors.cpp`, run the clean rebuild:

```bash
cd app
npx expo prebuild --clean --platform ios
cd ios && pod install && cd ..
npx expo run:ios --no-bundler
```

Default output directories:

- Android local: `.artifacts/maestro/local/android-<run-id>/`
- iOS local: `.artifacts/maestro/local/ios-<run-id>/`

## Optional Manual Debug Mode

If you need to inspect backend behavior outside the smoke wrapper, you may still run:

```bash
make api
make worker
```

This is only for debugging. The supported local smoke contract still requires the smoke command itself to auto-start the services.

## Regression Suite Before Finalization

Run the existing regression commands plus both platform smoke paths:

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
uv run --directory backend pytest --cov=backend.src --cov-report=term-missing
make maestro-android-local
make maestro-ios-local
```

If shared UI or reusable note components are changed while stabilizing the smoke flow, also run:

```bash
corepack pnpm storybook:build
```

## CI Expectation

Open the GitHub Actions workflow run and confirm:

- `android-smoke` and `ios-smoke` appear as separate mobile smoke jobs
- Each job uploads its platform-specific evidence bundle (`voice-notes-smoke-android`, `voice-notes-smoke-ios`)
- Jobs only run when smoke-relevant paths change
- If a platform emulator/simulator cannot provision, that platform's job fails instead of being downgraded to a warning
- Both jobs run independently — a failure on one platform does not suppress the other

Failure triage order:

1. Open `summary.txt` to see the stage classification (`preflight`, `service-bootstrap`, `build-install`, or `maestro`)
2. Inspect `logs/api.log`, `logs/worker.log`, `logs/metro.log`, and `logs/build-install.log`
3. Review the screenshots and command metadata in `maestro-output/` and `debug/`
