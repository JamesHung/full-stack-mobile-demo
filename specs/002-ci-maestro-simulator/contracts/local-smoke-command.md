# Contract: Local Smoke Command

## Purpose

Define the developer-facing contract for running the mobile Maestro smoke flow locally through repo-level commands.

## Public Entry Points

The implementation will expose these repo-root commands:

| Command | Purpose | Platform |
|---------|---------|----------|
| `make maestro-android-local` | Auto-start required services and run the canonical smoke flow on Android emulator | Android |
| `make maestro-ios-local` | Auto-start required services and run the canonical smoke flow on iOS simulator | iOS |

Both commands are expected to delegate to a shared wrapper such as `scripts/maestro/run-local.sh <platform>`.

## Required Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `platform` argument | Yes | `android` or `ios` |
| `MAESTRO_DEVICE_ID` | No | Explicit device selection when multiple targets are available |
| `VOICE_NOTES_API_BASE_URL` | No | Override backend base URL if the default platform mapping is not suitable |
| `MAESTRO_OUTPUT_ROOT` | No | Override the default artifact directory root |
| `SMOKE_RUN_ID` | No | Optional explicit run identifier for artifact naming and per-run note generation |

## Mandatory Preconditions

The command must fail before running Maestro if any required precondition is missing:

- Java 17+ is unavailable
- Maestro CLI is unavailable
- Target emulator/simulator is not available or not booted
- The app cannot be built or installed for the selected platform
- Backend Python dependencies are not synchronized through `uv`
- Repo JavaScript dependencies are not installed through the configured pnpm toolchain

## Mandatory Runtime Behavior

The command must:

1. Start the backend API and worker automatically
2. Wait for those services to become reachable before launching Maestro
3. Generate unique per-run note data while reusing the seeded demo account and canonical failure path
4. Stop and report failure immediately if an auto-started service exits or fails health checks during the run
5. Preserve service logs alongside Maestro evidence

## Successful Output Contract

On success, the command must:

- Exit with code `0`
- Print the selected platform, flow file, run identifier, and output directory
- Emit a JUnit XML report
- Emit a Maestro output directory containing screenshots and command metadata
- Emit a debug log directory containing `maestro.log`
- Emit API and worker log files for the auto-started services

## Failure Output Contract

On failure, the command must:

- Exit with a non-zero code
- Identify whether the failure occurred during preflight, service bootstrap, build/install, or Maestro execution
- Print the failing platform and the artifact/debug directory paths, if created
- Preserve partial evidence and service logs for post-run inspection when the failure happens after execution begins
