# Research: CI Maestro Simulator Runs

## Decision 1: Use GitHub Actions with separate Android and iOS smoke jobs

**Decision**: Implement the automated smoke gate in GitHub Actions with `android-smoke` on Linux and `ios-smoke` on macOS instead of one combined mobile job.

**Rationale**: The repository already uses GitHub as its origin, Android emulator execution is better suited to Linux runners, iOS simulator execution requires macOS, and the spec explicitly requires distinct platform results. Split jobs preserve clear branch-protection signals and artifact ownership.

**Alternatives considered**:

- Run both platforms on one macOS job: rejected because it wastes macOS capacity on Android and weakens platform-specific reporting.
- Use only hosted external build/test infrastructure: rejected because the repo does not yet have such configuration and the feature goal prioritizes repo-owned local/CI parity.

**Sources**:

- Maestro React Native support: https://docs.maestro.dev/get-started/supported-platform/react-native
- GitHub-hosted runners reference: https://docs.github.com/en/actions/reference/github-hosted-runners-reference
- Repo remote and current file layout

## Decision 2: Use Expo native development builds as the first supported app-install path

**Decision**: Standardize on Expo native development builds installed through `expo run:android` and `expo run:ios` for both local and CI smoke execution.

**Rationale**: The repo already uses Expo-managed React Native, contains an existing iOS native project under `app/ios`, and has no alternative build abstraction. Native development builds are the shortest path to installable simulator/emulator apps while keeping local debugging and CI execution aligned.

**Alternatives considered**:

- Expo Go only: rejected because the smoke workflow needs an installable app target and deterministic `appId` parity.
- EAS-only simulator artifacts: rejected for the first iteration because it adds remote build setup before a stable in-repo smoke baseline exists.

**Sources**:

- Expo local app development: https://docs.expo.dev/guides/local-app-development/
- Expo development builds: https://docs.expo.dev/develop/development-builds/create-a-build/
- Existing `app/app.json` and `app/ios`

## Decision 3: Always hit the real backend API and real worker in local and CI smoke runs

**Decision**: The smoke workflow will never use mocked or stubbed backend responses; both local and CI runs must exercise the real FastAPI app and the real background worker.

**Rationale**: The spec requires verification that the session returned at sign-in is actually used by subsequent list, create, upload, and retry actions. That requirement only has meaningful signal if the full app-to-API-to-worker path is active. The repo already has concrete API and worker entry points in `Makefile`, so this does not require inventing a second runtime.

**Alternatives considered**:

- Mock all backend calls: rejected because it cannot verify token propagation or retry/job behavior.
- Use real API but stub the worker: rejected because it weakens retry-path validation and hides background-processing failures.

**Sources**:

- `Makefile`
- `backend/src/main.py`
- `backend/src/workers/notes.py`
- Clarified spec requirements FR-004, FR-004a

## Decision 4: Local smoke commands should auto-start the backend API and worker

**Decision**: `make maestro-android-local` and `make maestro-ios-local` will delegate to repo-level shell wrappers that start the backend API and worker automatically, wait for readiness, run the smoke flow, and clean up or surface service failures.

**Rationale**: The repository already exposes `make api` and `make worker`, so the most consistent public interface is to extend `Makefile` rather than require contributors to open multiple terminals. Auto-start also matches the clarified spec and reduces local reproduction friction without changing backend behavior.

**Alternatives considered**:

- Require developers to start API and worker manually: rejected because clarification explicitly chose auto-start and because it adds repetitive setup.
- Hide orchestration inside `app/package.json`: rejected because the workflow spans backend, mobile tooling, and service lifecycle beyond the JS package boundary.

**Sources**:

- `Makefile`
- `README.md`
- `backend/pyproject.toml`
- Repo integration analysis for local orchestration

## Decision 5: Use path-filtered CI triggers rather than running smoke on every pull request

**Decision**: GitHub Actions smoke jobs will run automatically only when smoke-relevant files change: `app/**`, `backend/**`, `packages/shared/**`, `.maestro/**`, `scripts/maestro/**`, `.github/workflows/**`, `Makefile`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `backend/pyproject.toml`, `backend/uv.lock`, and `app/app.json`.

**Rationale**: The clarified spec requires smoke execution for mobile-impacting changes while allowing smoke-unrelated work to skip the expensive mobile jobs. The selected path set covers app UI copy/selectors, backend runtime behavior, shared DTOs, flow definitions, orchestration scripts, lockfiles, and bundle/package identifiers.

**Alternatives considered**:

- Run smoke on every pull request: rejected because it burns emulator/simulator time on irrelevant changes.
- Trigger only on app paths: rejected because backend, shared contracts, workflow scripts, and lockfiles can all break the smoke journey.

**Sources**:

- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- Repo integration analysis for path coverage
- Clarified spec requirement FR-008a

## Decision 6: Keep fixtures deterministic by using a seeded demo account plus run-scoped note data

**Decision**: Preserve the seeded demo account, canonical sample audio, and failure/retry semantics, but generate unique per-run note data so no smoke execution depends on leftover note or job state from earlier runs.

**Rationale**: The repo already has deterministic copy and fixture behavior in `app/sign-in.tsx`, `app/notes/create.tsx`, and `backend/src/workers/notes.py`. Reusing those fixed behaviors while isolating note-level data gives repeatability without requiring a destructive database reset or a debug-only reset endpoint.

**Alternatives considered**:

- Rebuild the full database before every run: rejected because it adds heavier orchestration and is unnecessary for the clarified scope.
- Add a reset/debug endpoint: rejected because the clarified spec chose run-scoped data instead of a cleanup surface.

**Sources**:

- `app/sign-in.tsx`
- `app/notes/create.tsx`
- `backend/src/workers/notes.py`
- Clarified spec requirement FR-009a

## Decision 7: Use explicit platform/device selection and environment-driven runtime inputs

**Decision**: The smoke workflow will use explicit platform selection, optional device IDs, and environment-driven runtime inputs for `appId`, API base URL, and artifact root. The app runtime must support overriding the default backend base URL for emulator/simulator-specific access.

**Rationale**: The current API client defaults to `http://localhost:8000`, which is insufficiently explicit for cross-platform simulator execution. Explicit platform/device selection and config injection reduce multi-device flakiness and prevent hidden assumptions in both local and CI environments.

**Alternatives considered**:

- Let Maestro auto-pick the connected device: rejected because it is fragile in multi-device environments.
- Keep `appId` and API base URL hardcoded in one flow file: rejected because it prevents clean Android/iOS reuse and makes CI/local divergence more likely.

**Sources**:

- Maestro device targeting: https://docs.maestro.dev/maestro-flows/flow-control-and-logic/specify-and-start-devices
- `app/lib/api/client.ts`
- `app/app.json`
- `.maestro/voice-notes-smoke.yaml`

## Decision 8: Treat JUnit, Maestro artifacts, and debug logs as the minimum evidence bundle, and fail hard on provisioning errors

**Decision**: Every smoke run will emit platform-specific JUnit, Maestro output, and debug log directories, and a platform job that cannot provision its simulator/emulator must fail rather than downgrade to a warning or skip.

**Rationale**: JUnit provides CI-readable status, Maestro output preserves screenshots and command metadata, and debug logs preserve lower-level execution detail. Hard-failing provisioning aligns with the clarified spec and ensures branch protection keeps a meaningful signal when the platform itself is unavailable.

**Alternatives considered**:

- Keep only console output or JUnit: rejected because the evidence would be too sparse for diagnosis.
- Downgrade provisioning failures to warnings: rejected because it would undermine the distinct platform gate required by the spec.

**Sources**:

- Maestro test suites and reports: https://docs.maestro.dev/cli/test-suites-and-reports
- Maestro test output directory: https://docs.maestro.dev/cli/test-output-directory
- Maestro debug output: https://docs.maestro.dev/troubleshooting/debug-output
- GitHub artifact storage: https://docs.github.com/actions/using-workflows/storing-workflow-data-as-artifacts
- Clarified spec requirement FR-011a

## Decision 9: Align `newArchEnabled` to `true` across all iOS config files

**Decision**: Set `newArchEnabled` to `"true"` in `app/ios/Podfile.properties.json` to match the `true` already declared in `app/app.json`.

**Rationale**: New Architecture is the default for Expo 52 / React Native 0.76. The mismatch caused ReactCodegen to produce incomplete outputs, specifically missing `ComponentDescriptors.cpp` files. The Podfile reads `Podfile.properties.json` and sets `RCT_NEW_ARCH_ENABLED` accordingly — when the JSON says `"false"`, the native build uses old architecture codegen paths that are incompatible with the new-architecture app binary.

**Alternatives considered**:

- Set both to `false` (old architecture): rejected because the project already uses Expo 52 / RN 0.76 defaults and the spec clarification explicitly chose `true`.
- Remove `newArchEnabled` from Podfile.properties.json: rejected because `expo prebuild` regenerates this file and the Podfile explicitly reads it.

**Sources**:

- `app/app.json`: `"newArchEnabled": true`
- `app/ios/Podfile.properties.json`: `"newArchEnabled": "false"` (current, incorrect)
- `app/ios/Podfile` line 7: `ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'`
- Spec clarification session 2026-03-24: "Both set to `true`"
- `issuelog/2026-03-23-ios-smoke-reactcodegen-missing-componentdescriptors.md`

## Decision 10: Use `macos-latest` with default Xcode and `idb` for iOS CI

**Decision**: The `ios-smoke` CI job runs on `macos-latest` using the default pre-installed Xcode version. Maestro's iOS Simulator interaction requires `idb` (iOS Development Bridge), installed via `brew install idb-companion`.

**Rationale**: Pinning a specific Xcode version adds maintenance overhead and risks breaking when GitHub updates runner images. The spec clarification explicitly chose the default Xcode. `idb` is required because Maestro uses it as the transport layer for iOS Simulator commands — without it, Maestro cannot interact with the simulator on CI (locally, Maestro may fall back to other mechanisms, but CI environments are headless and require explicit `idb` support).

**Alternatives considered**:

- Pin Xcode via `xcode-select`: rejected per spec clarification and TC-019.
- Use `macos-14` or `macos-15` instead of `macos-latest`: rejected because explicit version pinning adds the same maintenance burden.
- Skip `idb` and rely on Maestro's built-in iOS support: rejected because Maestro's iOS Simulator interaction on CI requires `idb` as an explicit dependency.

**Sources**:

- GitHub-hosted runners reference: https://docs.github.com/en/actions/reference/github-hosted-runners-reference
- Maestro iOS platform support: https://docs.maestro.dev/get-started/supported-platform/react-native
- Spec clarification session 2026-03-24: "Use `macos-latest` with default pre-installed Xcode (do not pin)"
- Spec clarification session 2026-03-24: "Add `idb` as an explicit CI dependency requirement"
