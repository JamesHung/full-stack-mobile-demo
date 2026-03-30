# Tasks: Mobile Smoke Test Kit

**Input**: Design documents from `/specs/004-mobile-smoke-kit/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Vitest coverage is REQUIRED for all `packages/smoke-kit/src/` modules. Target ≥ 80% line coverage on config parsing, health check logic, log aggregation, and error summary formatting (TC-004, TC-008).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Package root**: `packages/smoke-kit/`
- **Source**: `packages/smoke-kit/src/`
- **Tests**: `packages/smoke-kit/__tests__/`
- **Templates**: `packages/smoke-kit/templates/`
- **Skill**: `skills/mobile-smoke-scaffold/`
- **Workflow**: `.github/workflows/`

---

## Phase 1: Setup (Package Scaffolding)

**Purpose**: Create the `packages/smoke-kit/` package structure, configure TypeScript, install dependencies, and register the package in the monorepo workspace.

- [ ] T001 Create package directory structure with `packages/smoke-kit/package.json` containing `name: "@voice-notes/smoke-kit"`, `bin: { "smoke-kit": "./bin/smoke-kit.sh" }`, and dependencies: `commander`, `ajv`, `tsx`
- [ ] T002 [P] Create TypeScript config at `packages/smoke-kit/tsconfig.json` extending `../../tsconfig.base.json` with `rootDir: "src"`, `outDir: "dist"`, and strict mode enabled
- [ ] T003 [P] Create CLI shell shim at `packages/smoke-kit/bin/smoke-kit.sh` that executes `npx tsx src/cli.ts "$@"` (FR-028 — shell scripts limited to minimal entry-point shims)
- [ ] T004 [P] Create exit code constants at `packages/smoke-kit/src/utils/exit-codes.ts` defining codes 0–7 per research.md R-006 (success, general error, config error, preflight failure, service startup failure, health check timeout, test execution failure, cleanup failure)
- [ ] T005 [P] Create platform utility at `packages/smoke-kit/src/utils/platform.ts` with platform-specific defaults for android/ios (runner OS, device detection commands, default ports)
- [ ] T006 Register `packages/smoke-kit` in root Vitest config at `vitest.config.ts` — add `packages/smoke-kit/src/**/*.ts` to coverage includes and `packages/smoke-kit/__tests__/**/*.test.ts` to test includes

**Checkpoint**: Package scaffolded, `pnpm install` succeeds, `smoke-kit --help` invocable

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented — config schema, config loader, health check probes, log utilities, and error summary formatter.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Config Layer

- [ ] T007 Implement JSON Schema definition at `packages/smoke-kit/src/config/schema.ts` — export the full Draft-07 schema object from `contracts/config-schema.md` covering SmokeConfig, ServiceConfig, MetroConfig, FlowConfig, ArtifactConfig, and HealthCheckDefaults (TC-006)
- [ ] T008 Implement TypeScript types at `packages/smoke-kit/src/config/types.ts` — define `SmokeConfig`, `ServiceConfig`, `MetroConfig`, `FlowConfig`, `ArtifactConfig`, `HealthCheckDefaults`, `SmokeRun`, `StageResult`, and `ErrorSummary` interfaces matching data-model.md entities
- [ ] T009 Implement config loader at `packages/smoke-kit/src/config/loader.ts` — load `smoke.config.json` from disk, validate via `ajv` against schema.ts, return typed `SmokeConfig` or throw with formatted validation errors per `contracts/config-schema.md` error format (FR-012, FR-021)

### Health Check Layer

- [ ] T010 [P] Implement TCP probe at `packages/smoke-kit/src/health/tcp-probe.ts` — use `net.createConnection()` to check port connectivity with configurable retry interval (default 2s) and timeout (default 60s) per research.md R-004
- [ ] T011 [P] Implement HTTP probe at `packages/smoke-kit/src/health/http-probe.ts` — use Node.js `fetch()` to GET configured health endpoint, accept 2xx as healthy, retry on connection refused / timeout / 5xx, with configurable interval and timeout per research.md R-004

### Log & Error Reporting Layer

- [ ] T012 [P] Implement log tail utility at `packages/smoke-kit/src/logs/tail.ts` — read last N lines (default 50) from a log file using `fs.readFile()` + split + slice (FR-015, research.md R-005)
- [ ] T013 [P] Implement error summary formatter at `packages/smoke-kit/src/logs/error-summary.ts` — render structured Error Summary in terminal format (box drawing characters) and GitHub Step Summary markdown format (collapsible `<details>` blocks) per `contracts/cli-commands.md` Error Summary Contract

### CLI Entry Point

- [ ] T014 Implement Commander-based CLI entry point at `packages/smoke-kit/src/cli.ts` — register `init`, `scaffold`, `preflight`, and `run` subcommands with global `--version` and `--help` options per research.md R-001 and `contracts/cli-commands.md`

### Foundational Tests

- [ ] T015 [P] Add Vitest tests for config schema validation at `packages/smoke-kit/__tests__/config/schema.test.ts` — valid config passes, missing required fields fail, invalid appId pattern fails, port range validation, nested ServiceConfig/MetroConfig/FlowConfig validation
- [ ] T016 [P] Add Vitest tests for config loader at `packages/smoke-kit/__tests__/config/loader.test.ts` — successful load, file-not-found error, invalid JSON error, schema validation failure with formatted messages
- [ ] T017 [P] Add Vitest tests for TCP probe at `packages/smoke-kit/__tests__/health/tcp-probe.test.ts` — successful connection, timeout after retries, connection refused handling
- [ ] T018 [P] Add Vitest tests for HTTP probe at `packages/smoke-kit/__tests__/health/http-probe.test.ts` — successful 2xx response, retry on 5xx, timeout expiry, connection refused retry
- [ ] T019 [P] Add Vitest tests for log tail at `packages/smoke-kit/__tests__/logs/tail.test.ts` — read last 50 lines, file shorter than N lines, empty file, non-existent file returns empty
- [ ] T020 [P] Add Vitest tests for error summary formatter at `packages/smoke-kit/__tests__/logs/error-summary.test.ts` — terminal format output matches box-drawing template, markdown format output includes collapsible details block, service name included for health check failures

**Checkpoint**: Foundation ready — config loads and validates, health probes work, error summaries render. All foundational tests pass. User story implementation can now begin.

---

## Phase 3: User Story 1 + User Story 4 — Scaffold & Init Commands (Priority: P1/P2) 🎯 MVP

**Goal**: A developer can run `smoke-kit init` to generate a validated `smoke.config.json` from auto-detected project structure, or `smoke-kit scaffold` to inject a complete smoke test structure (config + scripts + flows + CI workflow) into any Expo project. US1 and US4 are combined because `scaffold` internally uses `init` logic and they share the app detection utility.

**Independent Test**: Run `smoke-kit scaffold` against a mock Expo project directory and verify all expected files are created with correct variable substitution. Run `smoke-kit init` and verify generated config passes schema validation.

### Implementation for User Story 1 + 4

- [ ] T021 Implement app ID auto-detection at `packages/smoke-kit/src/utils/detect-app.ts` — scan for `app.json` in configured/detected app root, extract `expo.ios.bundleIdentifier` and `expo.android.package`, support both `app/` and `packages/*/` layouts per research.md R-008 (FR-002, SC-008)
- [ ] T022 Implement `init` command at `packages/smoke-kit/src/commands/init.ts` — detect project structure (app root, backend root, app ID), generate `smoke.config.json` with sensible defaults, validate against schema before writing, handle `--force` / `--dry-run` / `--app-root` / `--backend-root` / `--app-id` / `--output` flags per `contracts/cli-commands.md` (FR-011, FR-007)
- [ ] T023 [P] Create template config file at `packages/smoke-kit/templates/smoke.config.json` with `{{APP_ID}}`, `{{APP_ROOT}}`, `{{BACKEND_ROOT}}`, `{{API_PORT}}`, `{{METRO_PORT}}` placeholders per research.md R-010
- [ ] T024 [P] Create Maestro flow templates at `packages/smoke-kit/templates/flows/android-smoke.yaml`, `packages/smoke-kit/templates/flows/ios-smoke.yaml`, and `packages/smoke-kit/templates/flows/canonical-flow.yaml` — platform wrappers delegate to canonical flow skeleton with `{{APP_ID}}` substitution (FR-005)
- [ ] T025 [P] Create shell shim template at `packages/smoke-kit/templates/scripts/run-smoke.sh` — minimal entry-point that delegates to `smoke-kit run` (FR-004)
- [ ] T026 [P] Create consumer CI workflow template at `packages/smoke-kit/templates/workflows/smoke.yml` — calls the reusable workflow with platform and backend parameters (FR-006)
- [ ] T027 Implement `scaffold` command at `packages/smoke-kit/src/commands/scaffold.ts` — run init logic, copy templates from `packages/smoke-kit/templates/` to target project, perform `{{variable}}` substitution, `chmod +x` shell scripts, skip existing files unless `--force`, support `--dry-run` listing per `contracts/cli-commands.md` (FR-003, FR-004, FR-005, FR-006, FR-007)

### Tests for User Story 1 + 4

- [ ] T028 [P] [US1] Add Vitest tests for app detection at `packages/smoke-kit/__tests__/utils/detect-app.test.ts` — detect from `app/app.json`, detect from `packages/mobile/app.json`, handle missing `app.json`, handle missing platform identifiers (SC-008)
- [ ] T029 [P] [US4] Add Vitest tests for init command at `packages/smoke-kit/__tests__/commands/init.test.ts` — auto-detect generates valid config, `--dry-run` prints without writing, refuses overwrite without `--force`, custom `--app-root` reflected in output

**Checkpoint**: `smoke-kit init` generates valid config, `smoke-kit scaffold` injects all template files. US1 and US4 are independently testable.

---

## Phase 4: User Story 2 — Run Smoke Tests Locally via CLI (Priority: P1)

**Goal**: A developer invokes `smoke-kit run android` (or `ios`) and the CLI orchestrates the full pipeline: preflight → service startup → health check → Maestro test execution → cleanup. On failure, a structured Error Summary with log tails is displayed automatically.

**Independent Test**: Run `smoke-kit run android` on a machine with a booted emulator, verify services start, health checks pass, Maestro flows execute, and results are reported with correct exit codes.

### Orchestration Infrastructure

- [ ] T030 Implement service manager at `packages/smoke-kit/src/orchestrator/service-manager.ts` — spawn backend services via `child_process.spawn()`, track PIDs in a process registry, pipe stdout/stderr to log files, detect early exit failures per research.md R-007 (FR-017)
- [ ] T031 Implement cleanup handler at `packages/smoke-kit/src/orchestrator/cleanup.ts` — register `process.on('exit')`, `process.on('SIGINT')`, `process.on('SIGTERM')` handlers, SIGTERM each tracked process with 5s SIGKILL fallback, use process groups for orphan prevention per research.md R-007 (FR-017)
- [ ] T032 Implement pipeline executor at `packages/smoke-kit/src/orchestrator/pipeline.ts` — execute stages in order (config → preflight → service startup → health check → test execution → cleanup), on failure collect logs via `tail.ts`, render Error Summary via `error-summary.ts`, run cleanup, write `summary.json`, exit with stage-specific code per `contracts/cli-commands.md` pipeline stages table

### Output Artifacts

- [ ] T033 [P] Implement JUnit XML path manager at `packages/smoke-kit/src/output/junit.ts` — resolve artifact output paths from `ArtifactConfig`, create output directories, compute `{outputRoot}/{mode}/{platform}-{runId}/` structure (FR-019)
- [ ] T034 [P] Implement run summary generator at `packages/smoke-kit/src/output/summary.ts` — build `SmokeRun` object with run ID, platform, mode, timing, stage results, artifact paths, and write as `summary.json` per data-model.md entity 7 (FR-020)

### Commands

- [ ] T035 Implement `preflight` command at `packages/smoke-kit/src/commands/preflight.ts` — load config, check toolchain (node, pnpm, maestro, adb/xcodebuild), check workspace (node_modules, backend venv, app.json), check device availability, check port availability, report with ✅/❌ indicators and remediation guidance, support `--json` output per `contracts/cli-commands.md` (FR-010)
- [ ] T036 Implement `run` command at `packages/smoke-kit/src/commands/run.ts` — accept `<platform>` argument and options (`--config`, `--mode`, `--skip-preflight`, `--skip-backend`, `--skip-build`, `--run-id`, `--timeout`, `--verbose`), wire all pipeline stages through `pipeline.ts`, auto-detect CI mode via `$CI` env var, write Error Summary to `$GITHUB_STEP_SUMMARY` in CI mode per `contracts/cli-commands.md` (FR-009, FR-013, FR-015, FR-016, FR-018, FR-029)

### Tests for User Story 2

- [ ] T037 [P] [US2] Add Vitest tests for preflight command at `packages/smoke-kit/__tests__/commands/preflight.test.ts` — all checks pass returns exit 0, missing tool returns exit 3 with remediation, port conflict detected, JSON output format validated
- [ ] T038 [P] [US2] Add Vitest tests for pipeline executor at `packages/smoke-kit/__tests__/orchestrator/pipeline.test.ts` — successful pipeline completes all stages, failure at health-check stage triggers error summary and cleanup, stage-specific exit codes propagated

**Checkpoint**: `smoke-kit preflight` validates prerequisites, `smoke-kit run android` orchestrates full pipeline. Error summaries display on failure with log tails. US2 is independently testable with a booted emulator.

---

## Phase 5: User Story 3 — Reusable CI Workflow (Priority: P2)

**Goal**: Teams integrate smoke tests into CI by referencing a reusable GitHub Actions workflow with ≤ 10 lines of YAML. The workflow handles emulator boot, service startup, test execution, artifact upload, and error reporting to GitHub Step Summary.

**Independent Test**: Create a PR that triggers the reusable workflow, verify it starts services, runs tests, produces artifacts, and writes error summaries to Step Summary on failure.

### Implementation for User Story 3

- [ ] T039 [US3] Create reusable GitHub Actions workflow at `.github/workflows/smoke-kit-reusable.yml` — implement `workflow_call` with inputs: `platform` (required, enum: android/ios), `start-backend` (boolean, default true), `upload-artifacts` (boolean, default true), `timeout-minutes` (number, default 45), `config-path` (string, default smoke.config.json) per research.md R-009 (FR-022, FR-023, FR-026)
- [ ] T040 [US3] Add job steps to `.github/workflows/smoke-kit-reusable.yml` — platform-specific runner selection (macos-latest for iOS, ubuntu-latest for Android), Node.js + pnpm setup, emulator/simulator boot, `smoke-kit run` invocation, Error Summary output to `$GITHUB_STEP_SUMMARY` on failure, conditional artifact upload of JUnit XML + Maestro output + debug logs per `contracts/cli-commands.md` (FR-024, FR-025, SC-006)

**Checkpoint**: Reusable workflow callable with `uses: ./.github/workflows/smoke-kit-reusable.yml`. Consumer workflow requires ≤ 10 lines of YAML. US3 is testable via a PR-triggered run.

---

## Phase 6: User Story 5 — AI Agent Skill Definition (Priority: P3)

**Goal**: An AI coding agent reads the `mobile-smoke-scaffold` skill definition and can autonomously scaffold smoke test infrastructure for any Expo project without additional human guidance.

**Independent Test**: Provide the SKILL.md to an AI agent and verify it can determine the correct execution steps to scaffold smoke tests for a sample project.

### Implementation for User Story 5

- [ ] T041 [P] [US5] Create skill definition at `skills/mobile-smoke-scaffold/SKILL.md` — follow existing skill format (frontmatter, structured sections) from `skills/mobile-environment-doctor/SKILL.md`, document execution workflow (detect → init → scaffold → verify), required inputs (project root, optional app-root/backend-root overrides), expected outputs (list of generated files), and CLI commands to invoke (FR-001, FR-008)
- [ ] T042 [P] [US5] Create config reference at `skills/mobile-smoke-scaffold/references/config-reference.md` — document all `smoke.config.json` fields with types, defaults, descriptions, and examples sourced from `contracts/config-schema.md` and `data-model.md`

**Checkpoint**: Skill definition is complete and self-contained. An AI agent reading SKILL.md can execute scaffold workflow without additional guidance. US5 is testable by feeding SKILL.md to an agent session.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, documentation validation, coverage verification, and cleanup across all user stories.

- [ ] T043 [P] Extend Vitest coverage to ≥ 80% on `packages/smoke-kit/src/` — add missing edge case tests for `orchestrator/service-manager.ts`, `orchestrator/cleanup.ts`, `output/summary.ts`, and `commands/scaffold.ts`
- [ ] T044 [P] Validate quickstart.md scenarios from `specs/004-mobile-smoke-kit/quickstart.md` — verify all CLI commands (`init`, `scaffold`, `preflight`, `run`) execute as documented, exit codes match table, error summary format matches examples
- [ ] T045 [P] Code cleanup — remove unused imports, ensure no `any` types in `packages/smoke-kit/src/`, verify all module boundaries use explicit TypeScript interfaces per plan.md constitution check
- [ ] T046 Run the named automated regression suite: `pnpm vitest run --project smoke-kit --coverage` — confirm ≥ 80% line coverage, all tests pass, no regressions
- [ ] T047 Verify end-to-end smoke-kit integration — run `smoke-kit scaffold --dry-run` from repo root, then `smoke-kit init --dry-run`, confirm generated config passes schema validation, confirm all template files would be created at correct paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1+US4 (Phase 3)**: Depends on Foundational phase (config loader, types, exit codes)
- **US2 (Phase 4)**: Depends on Foundational phase (health probes, error summary, config loader)
- **US3 (Phase 5)**: Depends on US2 (`smoke-kit run` command must exist for workflow to invoke)
- **US5 (Phase 6)**: Depends on US1 (`scaffold` command must be stable for skill to reference)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1+US4 (P1/P2)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **US2 (P1)**: Can start after Foundational (Phase 2) — Independent of US1/US4
- **US3 (P2)**: Depends on US2 — workflow invokes `smoke-kit run` which must exist
- **US5 (P3)**: Depends on US1 — skill documents `scaffold` command which must be stable
- **US1+US4 and US2 CAN run in parallel** after Foundational phase completes

### Within Each User Story

- Types and schema before loader and commands
- Health probes before pipeline executor
- Log tail and error summary before pipeline executor
- Service manager and cleanup before run command
- Init command before scaffold command (scaffold uses init internally)
- Pipeline executor before run command
- Templates before scaffold command
- Tests defined alongside implementation (test files run after corresponding source)

### Parallel Opportunities

- **Phase 1**: T002, T003, T004, T005 can all run in parallel
- **Phase 2**: T010+T011 (health probes), T012+T013 (log layer) can run in parallel; T015–T020 (tests) can all run in parallel
- **Phase 3**: T023, T024, T025, T026 (templates) can all run in parallel; T028+T029 (tests) in parallel
- **Phase 4**: T033+T034 (output) can run in parallel; T037+T038 (tests) in parallel
- **Phase 3 and Phase 4 can run in parallel** (different files, independent command implementations)
- **Phase 6**: T041+T042 can run in parallel (different directories)
- **Phase 7**: T043, T044, T045 can all run in parallel

---

## Parallel Example: Phase 3 + Phase 4 (after Foundational complete)

```
Developer A (US1+US4 — Scaffold & Init):          Developer B (US2 — Run & Preflight):
─────────────────────────────────────────          ──────────────────────────────────────
T021  detect-app.ts                                T030  service-manager.ts
T023  templates/smoke.config.json          ║       T031  cleanup.ts
T024  templates/flows/*.yaml               ║       T032  pipeline.ts
T025  templates/scripts/run-smoke.sh       ║       T033  output/junit.ts
T026  templates/workflows/smoke.yml        ║       T034  output/summary.ts
T022  commands/init.ts                             T035  commands/preflight.ts
T027  commands/scaffold.ts                         T036  commands/run.ts
T028  detect-app.test.ts                           T037  preflight.test.ts
T029  init.test.ts                                 T038  pipeline.test.ts
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3 only)

1. Complete Phase 1: Setup — package scaffolded and installable
2. Complete Phase 2: Foundational — config, health probes, error summary working
3. Complete Phase 3: US1+US4 — `init` and `scaffold` commands functional
4. **STOP and VALIDATE**: Run `smoke-kit scaffold --dry-run` on a test project, verify all files generated correctly
5. Deploy/demo: developers can scaffold smoke tests into any Expo project

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1+US4 (init + scaffold) → Test independently → **MVP!** Developers can onboard projects
3. Add US2 (preflight + run) → Test independently → Full local smoke test execution
4. Add US3 (CI workflow) → Test independently → Automated CI quality gate
5. Add US5 (skill definition) → Test independently → AI agent automation
6. Polish → Full coverage, docs validation, integration testing

### Single Developer Strategy

Execute phases sequentially in priority order:
1. Phase 1 → Phase 2 → Phase 3 (US1+US4) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US5) → Phase 7

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No Python code is added or modified — this is a pure TypeScript tooling package
- No UI components — no NativeWind, TanStack Query, or Storybook concerns
- Shell scripts limited to minimal shims per FR-028
- JSON Schema is the shared validation artifact (TC-006) — no Zod, no Pydantic
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Regression suite: `pnpm vitest run --project smoke-kit --coverage`
