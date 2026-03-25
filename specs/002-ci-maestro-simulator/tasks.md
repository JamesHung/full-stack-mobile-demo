# Tasks: CI Maestro Simulator Runs

**Input**: Design documents from `/specs/002-ci-maestro-simulator/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Vitest coverage is REQUIRED for changed frontend/shared behavior. Backend changes REQUIRE `pytest` coverage with a target above 80 percent for the affected backend package or service.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the smoke orchestration surfaces and file locations required by the implementation plan.

- [X] T001 Create smoke orchestration entry files in `scripts/maestro/preflight.sh`, `scripts/maestro/run-local.sh`, and `scripts/maestro/run-ci.sh`
- [X] T002 [P] Create platform wrapper flow files in `.maestro/android-smoke.yaml` and `.maestro/ios-smoke.yaml`
- [X] T003 [P] Prepare generated artifact ignore rules in `.gitignore`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core smoke infrastructure that MUST be complete before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create platform-aware backend URL helper in `app/lib/api/baseUrl.ts`
- [X] T005 Update `app/lib/api/client.ts` to consume `app/lib/api/baseUrl.ts`
- [X] T006 [P] Parameterize canonical smoke inputs in `.maestro/voice-notes-smoke.yaml`
- [X] T007 [P] Add Vitest coverage for smoke runtime config in `tests/unit/api-base-url.test.ts` and `tests/unit/maestro-run-data.test.ts`
- [X] T008 [P] Add backend regression coverage for smoke retry and worker assumptions in `backend/tests/test_note_detail_retry.py` and `backend/tests/test_smoke_worker_flow.py`
- [X] T009 Update repo-level smoke targets and shared command wiring in `Makefile`

**Checkpoint**: Foundation ready. User story work can now proceed.

---

## Phase 3: User Story 1 - Run Deterministic Local Mobile Smoke Tests (Priority: P1) 🎯 MVP

**Goal**: Give developers one documented local command per platform that auto-starts services, runs the real smoke flow, and emits evidence.

**Independent Test**: With a booted Android emulator or iOS simulator, run `make maestro-android-local` or `make maestro-ios-local` from a clean checkout and verify the command auto-starts API + worker, creates unique note data, completes the flow, and leaves JUnit/Maestro evidence behind.

### Tests for User Story 1

- [X] T010 [P] [US1] Extend local runtime coverage in `tests/unit/api-base-url.test.ts` and `tests/unit/maestro-run-data.test.ts`
- [X] T011 [P] [US1] Add integration validation for local smoke fixture wiring in `tests/integration/maestro-local-fixture.test.ts`

### Implementation for User Story 1

- [X] T012 [US1] Implement prerequisite validation and readiness probes in `scripts/maestro/preflight.sh`
- [X] T013 [US1] Implement backend API and worker auto-start with cleanup in `scripts/maestro/run-local.sh`
- [X] T014 [P] [US1] Wire Android local smoke execution and evidence output in `.maestro/android-smoke.yaml` and `scripts/maestro/run-local.sh`
- [X] T015 [P] [US1] Wire iOS local smoke execution and evidence output in `.maestro/ios-smoke.yaml` and `scripts/maestro/run-local.sh`
- [X] T016 [US1] Expose `maestro-android-local` and `maestro-ios-local` targets in `Makefile`
- [X] T017 [US1] Document local smoke commands, auto-start behavior, and artifact locations in `README.md`

**Checkpoint**: User Story 1 is independently runnable on a developer machine.

---

## Phase 4: User Story 2 - Trust CI To Enforce The Same Mobile Journey (Priority: P2)

**Goal**: Add path-filtered Android and iOS CI smoke jobs that execute the same real backend/worker journey and publish platform-specific evidence.

**Independent Test**: Push a smoke-relevant change and confirm GitHub Actions runs `android-smoke` and `ios-smoke`; push a smoke-unrelated change and confirm the workflow does not execute those jobs.

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement CI smoke wrapper with platform-specific artifact naming in `scripts/maestro/run-ci.sh`
- [X] T019 [US2] Create path-filtered `android-smoke` and `ios-smoke` jobs in `.github/workflows/mobile-smoke.yml`
- [X] T020 [US2] Wire dependency install, backend/worker boot, Expo build/install, and Maestro execution steps in `.github/workflows/mobile-smoke.yml`
- [X] T021 [US2] Add artifact upload and fail-on-provisioning rules in `.github/workflows/mobile-smoke.yml` and `scripts/maestro/run-ci.sh`
- [X] T022 [US2] Document CI trigger scope and workflow expectations in `README.md`

**Checkpoint**: User Story 2 is independently verifiable in GitHub Actions.

---

## Phase 5: User Story 3 - Diagnose Failures Without Guesswork (Priority: P3)

**Goal**: Make local and CI failures classify clearly enough that developers can tell whether the breakage is environment, orchestration, or real product regression.

**Independent Test**: Force a known failure path and verify the resulting output shows the platform, failing step, service/provisioning status, and artifact locations without requiring guesswork.

### Tests for User Story 3

- [X] T023 [P] [US3] Update failure-path integration coverage in `tests/integration/note-detail-retry.test.ts` and `tests/integration/voice-note-create-upload.test.ts`
- [X] T024 [P] [US3] Add backend regression coverage for failure diagnostics in `backend/tests/test_note_detail_retry.py` and `backend/tests/test_create_upload_flow.py`

### Implementation for User Story 3

- [X] T025 [P] [US3] Add explicit assertion checkpoints and named failure steps in `.maestro/voice-notes-smoke.yaml`, `.maestro/android-smoke.yaml`, and `.maestro/ios-smoke.yaml`
- [X] T026 [US3] Enhance failure classification and service-exit reporting in `scripts/maestro/preflight.sh`, `scripts/maestro/run-local.sh`, and `scripts/maestro/run-ci.sh`
- [X] T027 [US3] Ensure CI always uploads partial diagnostics and service logs on failure in `.github/workflows/mobile-smoke.yml`
- [X] T028 [US3] Document artifact triage and failure interpretation in `README.md` and `specs/002-ci-maestro-simulator/quickstart.md`

**Checkpoint**: User Story 3 provides actionable diagnostics for local and CI failures.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, visual-regression follow-through, and full-suite validation across all stories.

- [X] T029 [P] Update reusable note stories in `app/features/notes/components/NoteCard.stories.tsx` and `app/features/notes/components/ResultPanel.stories.tsx` if smoke stabilization changes reusable UI states
- [X] T030 [P] Verify Storybook regression wiring in `.storybook/main.ts` and `package.json` when reusable UI changes require it
- [X] T031 Run the full regression suite documented in `specs/002-ci-maestro-simulator/quickstart.md` and capture any follow-up command changes in `README.md`
- [X] T032 [P] Align final smoke usage and CI documentation in `README.md` and `specs/002-ci-maestro-simulator/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies. Start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1. Blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2 only. Delivers the MVP.
- **Phase 4 (US2)**: Depends on Phase 2 only. Can proceed in parallel with US1 after foundation is complete.
- **Phase 5 (US3)**: Depends on Phase 2 and is most effective after US1 + US2 exist, because it hardens both local and CI execution paths.
- **Phase 6 (Polish)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: No dependencies beyond foundational work.
- **US2 (P2)**: No dependencies beyond foundational work, but reuses the canonical flow and shared smoke helpers created earlier.
- **US3 (P3)**: Depends conceptually on the local and CI runners from US1 and US2 so diagnostics can cover both paths.

### Parallel Opportunities

- **Setup**: `T002` and `T003` can run in parallel with `T001` once directory choices are fixed.
- **Foundational**: `T006`, `T007`, and `T008` can run in parallel after `T004`/`T005` establish runtime config direction.
- **US1**: `T014` and `T015` can run in parallel after `T012`/`T013` define the runner contract.
- **US2**: `T018` and `T019` can run in parallel before being integrated by `T020` and `T021`.
- **US3**: `T023` and `T024` can run in parallel; `T025` can also proceed alongside `T026`.

---

## Parallel Example: User Story 1

```bash
# After T012/T013 define the local runner contract:
Task: "Wire Android local smoke execution and evidence output in .maestro/android-smoke.yaml and scripts/maestro/run-local.sh"
Task: "Wire iOS local smoke execution and evidence output in .maestro/ios-smoke.yaml and scripts/maestro/run-local.sh"
```

## Parallel Example: User Story 2

```bash
# Build the CI wrapper and workflow skeleton in parallel:
Task: "Implement CI smoke wrapper with platform-specific artifact naming in scripts/maestro/run-ci.sh"
Task: "Create path-filtered android-smoke and ios-smoke jobs in .github/workflows/mobile-smoke.yml"
```

## Parallel Example: User Story 3

```bash
# Harden diagnostics across tests and runner code together:
Task: "Update failure-path integration coverage in tests/integration/note-detail-retry.test.ts and tests/integration/voice-note-create-upload.test.ts"
Task: "Enhance failure classification and service-exit reporting in scripts/maestro/preflight.sh, scripts/maestro/run-local.sh, and scripts/maestro/run-ci.sh"
```

---

## Phase 7: iOS Build Fix & CI Pipeline (FR-015, FR-016, TC-018, TC-019)

**Purpose**: Fix the broken iOS native build and add the missing `ios-smoke` CI job. All T001–T032 are marked complete but iOS is non-functional.

**⚠️ CRITICAL**: Group A (local build fix) MUST pass before Group B (CI) begins.

### Group A: Fix iOS Native Build (Priority 1)

- [X] T033 [US1] Align `newArchEnabled` to `"true"` in `app/ios/Podfile.properties.json` (TC-018)
- [X] T034 [US1] Run `npx expo prebuild --clean --platform ios` to regenerate iOS native project with correct codegen (FR-015 step 1-2)
- [X] T035 [US1] Run `cd app/ios && pod install` to install pods with new architecture enabled (FR-015 step 3)
- [X] T036 [US1] Verify `ComponentDescriptors.cpp` files exist in `app/ios/build/generated/ios/react/renderer/components/` (FR-015 step 4)
- [X] T037 [US1] Build iOS app with `pnpm --filter app exec expo run:ios --no-bundler` — must succeed (exit 0) (FR-015 step 5)
- [X] T038 [US1] Run full `make maestro-ios-local` and verify Maestro happy-path passes on iOS simulator (FR-015 step 6)

### Group B: Add iOS CI Job (Priority 2)

- [X] T039 [US2] Add `ios-smoke` job to `.github/workflows/mobile-smoke.yml` with `macos-latest` runner (FR-016, TC-019)
- [X] T040 [US2] Configure CI steps: checkout, install pnpm/Node.js 22/Python 3.13, install Maestro CLI + `idb` (TC-019)
- [X] T041 [US2] Add iOS simulator boot step targeting "iPhone 16" with default iOS version (TC-019)
- [X] T042 [US2] Add iOS build step using `expo run:ios --no-bundler` and Maestro run step (FR-016)
- [X] T043 [US2] Add artifact upload for `voice-notes-smoke-ios` evidence (FR-016)
- [X] T044 [US2] Validate complete workflow YAML syntax with `actionlint` or equivalent

### Group C: Documentation & Regression

- [X] T045 [US3] Update `issuelog/2026-03-23-ios-smoke-reactcodegen-missing-componentdescriptors.md` with resolution details
- [X] T046 [US3] Run full regression suite (lint → test → build) to confirm no regressions

### Dependency Graph (Phase 7)

```
T033 → T034 → T035 → T036 → T037 → T038
                                       ↓
                              T039 → T040 → T041 → T042 → T043 → T044
                                                                    ↓
                                                           T045 + T046
```

### Parallel Opportunities

- T045 and T046 can run in parallel after T044 completes.
- Within Group B, T039–T044 are sequential (each step builds on the previous).

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate local Android/iOS smoke independently
5. Demo the local smoke workflow before adding CI

### Incremental Delivery

1. Finish Setup + Foundational to create the shared smoke substrate
2. Deliver US1 for local deterministic smoke runs
3. Deliver US2 for path-filtered GitHub Actions enforcement
4. Deliver US3 for failure diagnostics and hardening
5. Finish with Phase 6 polish and the full regression suite
6. **Phase 7**: Fix iOS build regression and add iOS CI pipeline
