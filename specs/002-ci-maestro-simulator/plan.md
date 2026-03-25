# Implementation Plan: CI Maestro Simulator Runs

**Branch**: `002-ci-maestro-simulator` | **Date**: 2026-03-23 (updated 2026-03-24) | **Spec**: [spec.md](/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/002-ci-maestro-simulator/spec.md)
**Input**: Feature specification from `/specs/002-ci-maestro-simulator/spec.md`

## Summary

Add a repo-level mobile smoke workflow that keeps one canonical Maestro journey but makes execution explicit per platform. Local entry points will live at the repo root, auto-start the real backend API and worker, build or install the Expo app for Android emulator or iOS simulator, and emit JUnit plus Maestro evidence. GitHub Actions will add path-filtered Android and iOS smoke jobs that hit the same real backend/worker flow, generate unique per-run note data, and fail hard when a required simulator/emulator cannot be provisioned.

**Update 2026-03-24**: Two high-priority work items added to unblock iOS smoke execution. Priority 1 fixes the iOS native build regression caused by a `newArchEnabled` mismatch between `app/app.json` and `app/ios/Podfile.properties.json`. Priority 2 adds the missing `ios-smoke` CI job to `.github/workflows/mobile-smoke.yml`. These items correspond to new spec requirements FR-015, FR-016, TC-018, and TC-019.

## Technical Context

**Language/Version**: TypeScript 5.x for app and shared surfaces, Python 3.13 for backend and worker surfaces, POSIX shell for orchestration, YAML for Maestro and GitHub Actions definitions
**Primary Dependencies**: Expo 52, React Native 0.76, Expo Router 4, NativeWind 4, TanStack Query 5, FastAPI, Pydantic v2, `python-dotenv`, Maestro CLI, GitHub Actions, CocoaPods, `idb` (iOS Development Bridge for Maestro iOS Simulator interaction)
**Storage**: In-memory mobile auth session, backend SQLite, backend filesystem audio storage, and per-run smoke artifact directories containing JUnit, Maestro output, and debug logs
**Testing**: `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, `uv run --directory backend pytest --cov=backend.src --cov-report=term-missing`, `maestro test` on Android emulator and iOS simulator, and `corepack pnpm storybook:build` when reusable note UI changes
**Target Platform**: Expo-managed Android emulator, Expo-managed iOS simulator, GitHub Actions Linux/macOS runners, FastAPI backend, and background worker
**Project Type**: Full-stack mobile application with supporting backend, worker, shared package, and CI automation
**Performance Goals**: Local preflight failures surface within 1 minute, each platform smoke run completes within 15 minutes in CI, and contributors can reach a passing first local smoke run within 20 minutes from a clean checkout
**Constraints**: Smoke must hit the real backend API and worker, local smoke must auto-start those services, CI must trigger only on smoke-relevant path changes, per-run fixture data must be unique, simulator/emulator provisioning failures must fail the affected job, and app runtime configuration must support platform-aware API base URLs. `newArchEnabled` must be `"true"` in both `app/app.json` and `app/ios/Podfile.properties.json` (TC-018). iOS CI must use `macos-latest` with default Xcode, must install `idb`, and must target "iPhone 16" simulator (TC-019).
**Scale/Scope**: One canonical smoke flow with thin platform-specific wrappers or env files, two repo-level local Make targets, one GitHub Actions workflow with separate Android and iOS jobs, and targeted changes to app runtime config, orchestration scripts, and docs
**Visual Regression**: Existing Storybook + Chromatic path remains the visual regression baseline; only update note-related stories if smoke stabilization changes reusable components such as `NoteCard` or `ResultPanel`
**Backend API Docs**: Existing Swagger-visible descriptions for auth and notes endpoints remain mandatory; no new endpoint is planned unless smoke determinism requires a clearly documented support surface

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Result**: PASS

- Expo-managed React Native remains the baseline; this plan only adds simulator/dev-build automation and runtime configurability.
- Backend work stays on Python 3.13 with `uv`, using existing API and worker entry points in `Makefile`.
- Shared contracts remain centralized in `packages/shared`, especially note statuses and DTO boundaries already used by app and backend.
- TypeScript boundaries, Pydantic boundaries, service bootstrap expectations, and smoke-run environment inputs are all explicitly identified.
- Regression scope is explicit: `lint`, `test`, `build`, backend `pytest` regression, Android smoke, iOS smoke, and Storybook build when reusable note UI changes.
- Shared UI stories are only expected to change if reusable note components need selector or copy stabilization.
- NativeWind remains the default styling strategy; no alternate styling layer is introduced.
- TanStack Query continues to own sign-in, list refresh, note detail polling, upload, and retry server-state behavior exercised by the smoke flow.
- Backend configuration remains environment-driven with `.env` loading and no hardcoded secrets in scripts or flow files.
- Backend logging, custom exceptions, and Swagger descriptions remain required for any backend surface touched while stabilizing smoke execution.

**Post-Phase 1 Design Result**: PASS

- Research resolves all execution-policy clarifications from the spec: real backend/worker, local auto-start services, path-filtered CI triggers, run-scoped fixture data, and hard-fail provisioning behavior.
- The data model and contracts separate local orchestration, CI job policy, evidence retention, and run-scoped fixture data without introducing stack or governance exceptions.
- Quickstart and contract outputs align with the constitution by preserving repo-level workflows, typed/shared boundaries, and the full regression gate.
- **2026-03-24 addendum**: The iOS native build fix (FR-015, TC-018) and iOS CI job (FR-016, TC-019) introduce no new stack divergence. The fix aligns `newArchEnabled` to the Expo 52 / RN 0.76 default (`true`), which is the expected configuration for this project. The `ios-smoke` CI job mirrors the existing `android-smoke` structure with macOS runner substitution and `idb` as the only new dependency (required by Maestro for iOS Simulator interaction). No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-ci-maestro-simulator/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ci-smoke-workflow.md
│   └── local-smoke-command.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── mobile-smoke.yml              # Workflow with Android and iOS smoke jobs

.maestro/
├── voice-notes-smoke.yaml            # Canonical smoke journey
├── android-smoke.yaml                # Android wrapper or env entry
└── ios-smoke.yaml                    # iOS wrapper or env entry

scripts/
└── maestro/
    ├── preflight.sh                  # Prerequisite checks
    ├── run-local.sh                  # Local auto-start + Maestro runner
    ├── run-ci.sh                     # CI wrapper for artifact emission
    └── runtime-config.cjs            # Platform-specific config generator

Makefile                              # Public repo-level smoke entry points
README.md                             # Developer workflow documentation
package.json
pnpm-lock.yaml
pnpm-workspace.yaml

app/
├── app.json                          # Bundle/package identifiers, newArchEnabled: true
├── ios/
│   ├── Podfile                       # CocoaPods config, reads Podfile.properties.json
│   ├── Podfile.properties.json       # ⚠ MUST have newArchEnabled: "true" (FR-015, TC-018)
│   └── build/generated/              # ReactCodegen outputs (verified after prebuild)
├── app/
│   ├── sign-in.tsx
│   ├── (tabs)/index.tsx
│   └── notes/
│       ├── create.tsx
│       └── [noteId].tsx
├── features/
│   ├── auth/session.ts
│   └── notes/
│       ├── api/createNote.ts
│       ├── queries/
│       ├── hooks/
│       └── components/
└── lib/api/client.ts                 # API base URL override support

backend/
├── pyproject.toml
├── uv.lock
├── src/
│   ├── api/
│   ├── exceptions/
│   ├── logging/
│   ├── models/
│   ├── services/
│   ├── settings/
│   └── workers/
└── tests/

packages/
└── shared/
    └── src/
        ├── contracts/
        ├── validation/
        └── formatters/

tests/
├── integration/
├── unit/
└── mocks/

.storybook/
└── main.ts
```

**Structure Decision**: Keep the existing app, backend, shared package, and test layout. Add smoke-specific orchestration at the repo root through `.github/workflows/`, `.maestro/`, `scripts/maestro/`, and `Makefile`, while limiting code changes to runtime config, selector stability, and service orchestration support needed to keep the smoke journey deterministic.

## Complexity Tracking

No constitution violations or exception-driven complexity are currently required.

---

## Priority Work Items (2026-03-24)

### Priority 1: Fix iOS Native Build (FR-015, TC-018)

**Status**: ⚠️ BLOCKS all iOS smoke execution (local and CI)
**Spec refs**: FR-015, TC-018, Known Issues section
**Issue log**: `issuelog/2026-03-23-ios-smoke-reactcodegen-missing-componentdescriptors.md`

#### Root Cause

The iOS native build fails with `xcodebuild` error code 65 because ReactCodegen artifacts are incomplete. Specifically, `ComponentDescriptors.cpp` for `rngesturehandler_codegen` is missing from `app/ios/build/generated/ios/react/renderer/components/`.

The root cause is a configuration mismatch:
- `app/app.json` declares `"newArchEnabled": true` (boolean)
- `app/ios/Podfile.properties.json` declares `"newArchEnabled": "false"` (string)

The Podfile reads this value on line 7:
```ruby
ENV['RCT_NEW_ARCH_ENABLED'] = podfile_properties['newArchEnabled'] == 'true' ? '1' : '0'
```

When `newArchEnabled` is `"false"`, `RCT_NEW_ARCH_ENABLED` is set to `'0'`, causing the codegen layer to produce incomplete outputs that are inconsistent with what the app.json-driven build expects.

#### Fix Sequence

All commands run from the repo root. The sequence is prescribed by FR-015 and must be followed exactly.

**Step 1: Align `newArchEnabled` configuration**

Edit `app/ios/Podfile.properties.json` to set `newArchEnabled` to `"true"`:

```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "true"
}
```

**Why**: TC-018 requires both `app/app.json` and `app/ios/Podfile.properties.json` to have `newArchEnabled` set to `true`. New Architecture is the Expo 52 / React Native 0.76 default.

**Step 2: Clean prebuild to regenerate the native project**

```bash
cd app && npx expo prebuild --clean --platform ios
```

**What this does**: Removes the existing `app/ios/` directory and regenerates it from scratch using the current `app.json` configuration including the now-aligned `newArchEnabled: true`.

**Step 3: Install CocoaPods dependencies with correct architecture**

```bash
cd app/ios && pod install
```

**What this does**: Runs `pod install` within the regenerated `app/ios/` directory. Because `newArchEnabled` is now `"true"`, the Podfile will set `RCT_NEW_ARCH_ENABLED=1`, causing CocoaPods to build all React Native and community pods with New Architecture support, including full ReactCodegen outputs.

**Step 4: Verify ReactCodegen outputs**

```bash
# Verify ComponentDescriptors.cpp files exist for all codegen targets
find app/ios/build/generated/ -name "ComponentDescriptors.cpp" -type f
```

**Expected output**: At least one `ComponentDescriptors.cpp` file per codegen target, including `rngesturehandler_codegen`. If no files are found, the prebuild/pod install must be repeated or the issue escalated.

**Step 5: Build and verify iOS app on simulator**

```bash
pnpm --filter app exec expo run:ios --no-bundler
```

**What this does**: Builds the app using `xcodebuild` and installs it on the booted iOS simulator. The `--no-bundler` flag skips Metro startup since the build step only verifies native compilation succeeds.

**Step 6: Verify full local smoke flow**

```bash
make maestro-ios-local
```

**What this does**: Runs the complete iOS smoke pipeline including preflight checks, service auto-start (API + worker + Metro), app build/install, and Maestro flow execution. This is the definitive verification that the iOS build regression is resolved.

#### Files Changed

| File | Change |
|------|--------|
| `app/ios/Podfile.properties.json` | `"newArchEnabled": "false"` → `"newArchEnabled": "true"` |
| `app/ios/` (directory) | Fully regenerated by `expo prebuild --clean` |

#### Acceptance Criteria

- [ ] `app/ios/Podfile.properties.json` has `"newArchEnabled": "true"`
- [ ] `app/app.json` has `"newArchEnabled": true` (already correct, no change needed)
- [ ] `find app/ios/build/generated/ -name "ComponentDescriptors.cpp"` returns at least one result per codegen target
- [ ] `pnpm --filter app exec expo run:ios --no-bundler` exits with code 0
- [ ] `make maestro-ios-local` completes the full smoke flow successfully

#### Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| `expo prebuild --clean` deletes custom native modifications | The existing `app/ios/` is Expo-generated with no manual patches beyond Podfile.properties.json; the regenerated project will be functionally equivalent |
| New Architecture may introduce runtime regressions | The app already declares `newArchEnabled: true` in `app.json`; aligning Podfile.properties.json makes the build match the runtime expectation |
| CocoaPods version incompatibility | Use the same CocoaPods version already installed locally (1.11.3); CI will use the version available on `macos-latest` |

---

### Priority 2: Add iOS CI Job (FR-016, TC-019)

**Status**: ⚠️ BLOCKED by Priority 1 (iOS must build locally before CI can be authored)
**Spec refs**: FR-016, TC-019, FR-008, FR-011a
**Depends on**: Priority 1 completion (iOS native build must succeed)

#### Overview

Add an `ios-smoke` job to `.github/workflows/mobile-smoke.yml` that mirrors the existing `android-smoke` job structure but runs on `macos-latest` with iOS-specific tooling. The job must exercise the same canonical Maestro smoke flow against an iOS Simulator.

#### Job Definition

**File**: `.github/workflows/mobile-smoke.yml`
**Job name**: `ios-smoke`
**Runner**: `macos-latest` (default Xcode, no pinning per TC-019)
**Timeout**: 45 minutes (matching `android-smoke`)

#### Step-by-Step Job Structure

The `ios-smoke` job mirrors the `android-smoke` job with these platform-specific substitutions:

| Step | android-smoke (existing) | ios-smoke (new) |
|------|--------------------------|-----------------|
| Runner | `ubuntu-latest` | `macos-latest` |
| Platform tooling | Java 17 + KVM + Android emulator | Default Xcode + `idb` |
| Device provisioning | `reactivecircus/android-emulator-runner@v2` | `xcrun simctl boot "iPhone 16"` |
| App build | `expo run:android --no-bundler` | `expo prebuild --clean --platform ios` → `pod install` → `expo run:ios --no-bundler` |
| Maestro device | `adb devices` for `MAESTRO_DEVICE_ID` | `xcrun simctl list devices booted` for device UUID |
| Artifact name | `voice-notes-smoke-android` | `voice-notes-smoke-ios` |

#### Detailed Step Sequence

```yaml
ios-smoke:
  name: ios-smoke
  runs-on: macos-latest
  timeout-minutes: 45
  env:
    MAESTRO_OUTPUT_ROOT: ${{ github.workspace }}/.artifacts/maestro
    SMOKE_RUN_ID: ${{ github.run_id }}-${{ github.run_attempt }}
    MAESTRO_CLI_NO_ANALYTICS: 1
  steps:
    # 1. Checkout
    - name: Checkout
      uses: actions/checkout@v4

    # 2. Install pnpm
    - name: Install pnpm
      run: corepack enable

    # 3. Set up Node.js
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: pnpm

    # 4. Set up Python (for backend/worker)
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: "3.13"

    # 5. Install workspace dependencies
    - name: Install workspace dependencies
      run: pnpm install --frozen-lockfile

    # 6. Install backend dependencies
    - name: Install backend dependencies
      run: |
        python -m pip install uv
        uv sync --directory backend

    # 7. Install Maestro CLI
    - name: Install Maestro CLI
      run: |
        curl -Ls "https://get.maestro.mobile.dev" | bash
        echo "$HOME/.maestro/bin" >> "$GITHUB_PATH"

    # 8. Install idb (iOS Development Bridge - required by Maestro for iOS Simulator)
    - name: Install idb
      run: brew install idb-companion

    # 9. Boot iOS Simulator
    - name: Boot iPhone 16 Simulator
      run: |
        DEVICE_UDID=$(xcrun simctl list devices available -j \
          | python3 -c "
        import json, sys
        data = json.load(sys.stdin)
        for runtime, devices in data['devices'].items():
            for d in devices:
                if d['name'] == 'iPhone 16' and d['isAvailable']:
                    print(d['udid'])
                    sys.exit(0)
        sys.exit(1)
        ")
        xcrun simctl boot "$DEVICE_UDID"
        echo "MAESTRO_DEVICE_ID=$DEVICE_UDID" >> "$GITHUB_ENV"

    # 10. iOS native build (FR-015 sequence)
    - name: iOS native build
      run: |
        cd app
        npx expo prebuild --clean --platform ios
        cd ios && pod install && cd ..
        # Verify codegen outputs
        COUNT=$(find ios/build/generated/ -name "ComponentDescriptors.cpp" -type f 2>/dev/null | wc -l)
        if [ "$COUNT" -eq 0 ]; then
          echo "::error::ReactCodegen verification failed: no ComponentDescriptors.cpp found"
          exit 1
        fi
        echo "ReactCodegen verified: $COUNT ComponentDescriptors.cpp files found"

    # 11. Run iOS smoke
    - name: Run iOS smoke
      run: ./scripts/maestro/run-ci.sh ios

    # 12. Upload iOS smoke evidence
    - name: Upload iOS smoke evidence
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: voice-notes-smoke-ios
        path: .artifacts/maestro/ci/ios-${{ github.run_id }}-${{ github.run_attempt }}
        if-no-files-found: warn
```

#### Key Design Decisions

1. **No Xcode version pinning** (TC-019): `macos-latest` ships with a default Xcode. We do not use `xcode-select` to pin a version. This keeps the CI aligned with GitHub's runner updates.

2. **`idb` installed via Homebrew** (TC-019): Maestro requires `idb` (iOS Development Bridge) for iOS Simulator interaction. The `idb-companion` Homebrew formula is the standard installation path on macOS.

3. **"iPhone 16" simulator** (TC-019): The job boots an "iPhone 16" simulator using the default iOS version available on the runner. The device UUID is dynamically resolved using `xcrun simctl list devices`.

4. **FR-015 build sequence in CI**: The iOS build step follows the exact FR-015 sequence: `expo prebuild --clean --platform ios` → `cd ios && pod install` → verify codegen → build via `run-ci.sh ios` (which delegates to `run-local.sh --mode ci` which calls `expo run:ios --no-bundler`).

5. **Independent job execution**: `ios-smoke` and `android-smoke` run as independent jobs (no `needs` dependency). A failure on one platform does not suppress the other.

#### Files Changed

| File | Change |
|------|--------|
| `.github/workflows/mobile-smoke.yml` | Add `ios-smoke` job block after existing `android-smoke` job |

#### Acceptance Criteria

- [ ] `ios-smoke` job appears in the workflow YAML with `runs-on: macos-latest`
- [ ] No `xcode-select` version pinning in any step
- [ ] `idb-companion` is installed via `brew install`
- [ ] "iPhone 16" simulator is booted using `xcrun simctl`
- [ ] iOS native build follows FR-015 sequence (prebuild → pod install → codegen verify)
- [ ] Smoke flow runs via `./scripts/maestro/run-ci.sh ios`
- [ ] Evidence uploaded as `voice-notes-smoke-ios` artifact
- [ ] `android-smoke` job is unchanged
- [ ] Both jobs run independently (no `needs` coupling)
- [ ] Provisioning failure (no "iPhone 16" available) fails the job and publishes diagnostics (FR-011a)

#### Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| `macos-latest` runner may not have "iPhone 16" simulator | The step dynamically resolves the UDID and fails with a clear error if the device is not found; update the device name if GitHub changes runner images |
| `idb-companion` Homebrew install is slow | Homebrew is pre-installed on macOS runners; `idb-companion` is a lightweight formula; acceptable within the 45-minute timeout |
| iOS build is slower than Android on CI | 45-minute timeout matches Android; monitor and adjust if needed |
| Expo prebuild on CI may produce different outputs than local | Both environments use the same `app.json` and `Podfile.properties.json`; `--clean` ensures no stale state |

---

## Phase Rework Notes (2026-03-24)

### Phase 3 (US1 Local Smoke) — iOS Rework Required

The original Phase 3 implementation covered local smoke entry points for both Android and iOS. However, iOS local smoke (`make maestro-ios-local`) was **never verified end-to-end** because the native build was broken. With Priority 1 resolved:

- The `run-local.sh` script already handles `ios` as a platform argument
- The `preflight.sh` script already checks for iOS simulator availability
- The `runtime-config.cjs` already generates iOS-specific config (API URL: `http://127.0.0.1:8000`)
- **Rework needed**: After fixing the build (Priority 1), re-run `make maestro-ios-local` to validate the full pipeline end-to-end. Update `quickstart.md` to remove the "iOS Known Issue" section and add iOS to the regression suite.

### Phase 4 (US2 CI) — iOS Job Implementation Required

The original Phase 4 marked the `ios-smoke` CI job as complete, but the job was never added to `mobile-smoke.yml`. With Priority 2:

- **Rework needed**: Implement the `ios-smoke` job as specified above. This is not a rework of existing code — it is new implementation that was previously skipped.
- The existing `android-smoke` job must remain unchanged.
- The workflow trigger paths and `workflow_dispatch` trigger remain shared across both jobs.

### Existing Android Content — No Changes

All Android-related plan content, implementation, and CI job remain valid and unchanged. The `android-smoke` job is working correctly in CI. `make maestro-android-local` works correctly for local development.

---

## Research Addendum (2026-03-24)

### Decision 9: Align `newArchEnabled` to `true` across all iOS config files

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

### Decision 10: Use `macos-latest` with default Xcode and `idb` for iOS CI

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
