# Contract: CI Smoke Workflow

## Purpose

Define the workflow contract for automated Android and iOS Maestro smoke execution in GitHub Actions.

## Workflow Shape

The implementation will add one workflow file at `.github/workflows/mobile-smoke.yml` with at least these jobs:

| Job | Runner | Purpose |
|-----|--------|---------|
| `android-smoke` | Linux GitHub runner | Build/install app on Android emulator, boot required services, and run Maestro smoke |
| `ios-smoke` | macOS GitHub runner (`macos-latest`, default Xcode, no version pinning) | Clean prebuild, pod install, codegen verify, build/install app on iPhone 16 iOS simulator, boot required services, install `idb`, and run Maestro smoke |

## Trigger Contract

The workflow must run on pull requests and pushes that affect smoke-relevant surfaces, including:

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

When no matching path changes are present, the mobile smoke jobs should not run.

## Job Responsibilities

Each job must:

1. Restore repo dependencies and relevant platform caches
2. Prepare the backend API and worker required by the smoke journey
3. Build or install the app for the target simulator/emulator
4. Run the canonical Maestro smoke flow with platform-specific runtime configuration
5. Upload platform-specific evidence even when the run fails

## Provisioning Policy

- If the required emulator or simulator cannot be provisioned, the corresponding platform job must fail
- Provisioning failures must still publish any available diagnostics or partial logs
- A failure on one platform must not suppress execution or reporting of the other platform

## Required Evidence Per Job

Each job must upload an artifact bundle that contains:

- JUnit report for the smoke run
- Maestro output directory
- Maestro debug output directory
- Build/install log when build and execution are separate steps
- API and worker logs when those services are started inside the job

Artifact names must stay platform-specific. The baseline naming scheme is:

- `voice-notes-smoke-android`
- `voice-notes-smoke-ios`

## Status Contract

- Android and iOS must surface as separate workflow job statuses
- Reviewers must be able to map a failing artifact bundle to the corresponding workflow job without additional lookup logic
- Smoke-unrelated pull requests must not show the mobile smoke jobs as executed
