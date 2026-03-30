# Feature Specification: Mobile Smoke Test Kit

**Feature Branch**: `004-mobile-smoke-kit`  
**Created**: 2025-07-22  
**Status**: Draft  
**Input**: Productize existing `scripts/maestro/` smoke test infrastructure into a portable, reusable Smoke Kit for Expo / React Native + Node/Python Backend projects.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scaffold Smoke Tests for a New Project (Priority: P1)

A developer (or AI agent) adopts the Smoke Kit in a brand-new Expo + backend repository that has never had smoke tests. They run a single scaffold command and receive a fully functional smoke test structure — configuration file, orchestration scripts, flow templates, and a CI workflow — without manually copying files or editing paths.

**Why this priority**: This is the primary value proposition. Without the ability to inject a complete smoke test structure into any project, the remaining CLI and CI capabilities have nothing to operate on. This story unlocks every other story.

**Independent Test**: Can be fully tested by running the scaffold command against an empty Expo project and verifying all expected files are created with correct values derived from the project's app configuration.

**Acceptance Scenarios**:

1. **Given** a repository with `app.json` containing iOS `bundleIdentifier` and Android `package`, **When** the scaffold command runs, **Then** a `smoke.config.json` is created with the correct `appId` auto-detected from the project configuration.
2. **Given** a repository with no prior smoke test files, **When** the scaffold command runs, **Then** orchestration scripts, flow templates, and a CI workflow file are created in their canonical locations.
3. **Given** a monorepo where the mobile app lives under `packages/mobile` instead of `app/`, **When** the user specifies the app root during scaffold, **Then** the generated configuration references the correct path without assuming a default directory structure.
4. **Given** a repository that already has a `smoke.config.json`, **When** the scaffold command runs, **Then** the system warns the user and does not overwrite existing configuration without explicit confirmation.

---

### User Story 2 — Run Smoke Tests Locally via CLI (Priority: P1)

A developer wants to run mobile smoke tests on their local machine (macOS or Linux) against a running emulator or simulator. They invoke a single CLI command specifying the target platform. The CLI reads configuration, validates prerequisites, starts required backend services, waits for services to be healthy via port-based checks, orchestrates the test run, and reports results — aggregating error context on failure.

**Why this priority**: Local smoke test execution is the daily developer workflow. Improving reliability (port-based health checks over PID monitoring) and developer experience (automated error log aggregation) directly reduces time spent debugging test infrastructure failures.

**Independent Test**: Can be fully tested by running `smoke-kit run android` on a machine with a booted Android emulator, verifying that services start, health checks pass, tests execute, and results are reported with proper exit codes.

**Acceptance Scenarios**:

1. **Given** a valid `smoke.config.json` and a booted Android emulator, **When** `smoke-kit run android` is invoked, **Then** backend services start, port-based health checks confirm service readiness, Maestro flows execute, and results are displayed with a pass/fail summary.
2. **Given** a valid `smoke.config.json` and a booted iOS simulator, **When** `smoke-kit run ios` is invoked, **Then** the same orchestration occurs targeting the iOS platform with appropriate platform-specific defaults.
3. **Given** the backend service starts but fails to respond on its configured port within the health check timeout, **When** the health check expires, **Then** the CLI terminates the run, collects the last 50 lines of relevant service logs, and displays them as an Error Summary in the terminal.
4. **Given** any stage of the smoke test pipeline fails (preflight, service start, test execution), **When** the failure occurs, **Then** the CLI exits with a non-zero code and outputs an Error Summary containing the failing stage name, exit code, and the last 50 lines of associated logs.
5. **Given** a machine missing required toolchain components (e.g., Maestro not installed, no booted device), **When** `smoke-kit preflight` is invoked, **Then** the CLI lists all missing prerequisites with actionable remediation guidance.

---

### User Story 3 — Run Smoke Tests in CI via Reusable Workflow (Priority: P2)

A team configures their CI pipeline to run mobile smoke tests on every relevant pull request. They reference a reusable GitHub Actions workflow, passing parameters to control which platforms to test, whether to start the backend, and timeout thresholds. On failure, the CI automatically publishes an Error Summary to the GitHub Step Summary and uploads test artifacts.

**Why this priority**: CI integration transforms smoke tests from a manual developer activity into an automated quality gate. It depends on the CLI (Story 2) being functional and is the natural extension once local execution works reliably.

**Independent Test**: Can be tested by creating a pull request that triggers the reusable workflow on a CI runner, verifying the workflow starts services, runs tests, and produces artifacts and step summaries.

**Acceptance Scenarios**:

1. **Given** a repository calling the reusable workflow with `platform: android`, **When** the workflow runs on a GitHub Actions runner, **Then** an Android emulator boots, services start, smoke tests execute, and JUnit XML results are produced.
2. **Given** the workflow is called with `start-backend: false`, **When** the workflow runs, **Then** backend service startup is skipped (useful when tests target a pre-deployed environment).
3. **Given** a smoke test failure occurs during the CI run, **When** the job completes, **Then** an Error Summary appears in the GitHub Step Summary containing the failing stage, error context, and the last 50 lines of relevant logs.
4. **Given** the workflow completes (pass or fail), **When** artifact upload is enabled, **Then** test artifacts (JUnit XML, Maestro output, debug logs) are uploaded as GitHub Actions artifacts with a descriptive name.
5. **Given** the workflow is called with a custom timeout, **When** the test run exceeds that timeout, **Then** the job is cancelled gracefully with appropriate cleanup and summary output.

---

### User Story 4 — Initialize Configuration for an Existing Project (Priority: P2)

A developer wants to adopt the Smoke Kit in a project that already has some smoke test files but no standardized configuration. They run an initialization command that detects the project structure, generates a `smoke.config.json` with sensible defaults, and validates the configuration against the expected schema.

**Why this priority**: Onboarding existing projects is a common adoption path. This story bridges the gap between the current ad-hoc scripts and the structured kit, enabling incremental migration.

**Independent Test**: Can be tested by running `smoke-kit init` in a project with an existing `app.json` and `backend/` directory, verifying the generated configuration correctly identifies the app root, backend root, app ID, and port assignments.

**Acceptance Scenarios**:

1. **Given** a project with `app/app.json` containing platform identifiers, **When** `smoke-kit init` runs, **Then** a `smoke.config.json` is generated with `appId`, `appRoot`, `backendRoot`, port assignments, and health check endpoints populated from detected project structure.
2. **Given** the generated `smoke.config.json`, **When** validated against the configuration schema, **Then** it passes schema validation with no errors.
3. **Given** a project where the mobile app is not at the default `app/` path, **When** the user specifies an alternative app root, **Then** the configuration reflects the custom path.

---

### User Story 5 — AI Agent Automates Smoke Test Setup (Priority: P3)

An AI coding agent (e.g., Codex, Copilot) reads the Smoke Kit skill definition and autonomously scaffolds a complete smoke test structure for a repository it is working in. The skill definition provides the agent with clear instructions, expected inputs, and execution steps.

**Why this priority**: AI-driven automation is a force multiplier but depends on the scaffold (Story 1) and CLI (Story 2) being stable. It adds leverage but is not required for human developers to adopt the kit.

**Independent Test**: Can be tested by providing the skill definition to an AI agent session and instructing it to set up smoke tests for a sample Expo project, verifying the agent executes the correct commands and produces valid output.

**Acceptance Scenarios**:

1. **Given** an AI agent has access to the `mobile-smoke-scaffold` skill definition, **When** it processes a request to add smoke tests to a project, **Then** it invokes the scaffold command with the correct project-specific parameters.
2. **Given** the skill definition documents all required inputs and expected outputs, **When** an AI agent reads the definition, **Then** it can determine the correct execution steps without additional human guidance.

---

### Edge Cases

- What happens when the configured health check port is already occupied by another process? The preflight check should detect the port conflict and report it before starting services.
- What happens when the developer's emulator/simulator crashes mid-test? The CLI should detect the lost device, terminate remaining processes, and produce an Error Summary indicating device disconnection.
- What happens when `smoke.config.json` references a backend start command that does not exist? The preflight check should validate that the command is resolvable before attempting execution.
- What happens when running on a Linux CI runner that does not support iOS simulators? The workflow should skip iOS jobs on non-macOS runners and report the skip reason.
- What happens when the project's `app.json` does not contain platform identifiers? The scaffold/init command should prompt for manual app ID input or fail with a clear error.
- What happens when multiple backend services are configured but only some start successfully? The CLI should report which health checks passed and which failed, then terminate with a partial failure summary.

## Requirements *(mandatory)*

### Functional Requirements

#### Codex Skill — `mobile-smoke-scaffold`

- **FR-001**: The skill MUST define a clear execution workflow that an AI agent can follow to scaffold smoke test infrastructure for an Expo / React Native project.
- **FR-002**: The scaffold process MUST auto-detect the app identifier (iOS `bundleIdentifier` and Android `package`) from the project's app configuration file.
- **FR-003**: The scaffold process MUST generate a `smoke.config.json` configuration file with project-specific values for app ID, app root, backend root, port assignments, health check endpoints, artifact output directory, and flow file directory.
- **FR-004**: The scaffold process MUST inject orchestration script templates (preflight, run-local, run-ci entry points) into the project.
- **FR-005**: The scaffold process MUST inject Maestro flow templates (platform wrapper files and a canonical flow skeleton) into the project.
- **FR-006**: The scaffold process MUST inject a GitHub Actions CI workflow template into the project.
- **FR-007**: The scaffold process MUST NOT overwrite existing files without explicit user confirmation.
- **FR-008**: The skill definition MUST follow the project's existing skill format (SKILL.md with frontmatter, structured sections, and supporting scripts).

#### CLI Wrapper — `smoke-kit`

- **FR-009**: The CLI MUST provide a `run <platform>` command that orchestrates the full smoke test pipeline: preflight → service startup → health check → test execution → cleanup.
- **FR-010**: The CLI MUST provide a `preflight` command that validates all prerequisites (toolchain, workspace, device/simulator availability) and reports missing items with remediation guidance.
- **FR-011**: The CLI MUST provide an `init` command that detects project structure and generates a valid `smoke.config.json`.
- **FR-012**: The CLI MUST read all configuration from `smoke.config.json` and MUST NOT hardcode project-specific paths, port numbers, or app identifiers.
- **FR-013**: The CLI MUST use port-based health checks (HTTP endpoint probing with retries and timeout) to confirm service readiness, replacing PID-based liveness monitoring.
- **FR-014**: The CLI MUST support configurable health check parameters per service: port, path, and timeout.
- **FR-015**: When any stage of the pipeline fails, the CLI MUST automatically collect the last 50 lines of relevant logs and output them as a structured Error Summary to the terminal.
- **FR-016**: The CLI MUST exit with distinct non-zero exit codes for different failure categories (preflight failure, service startup failure, health check timeout, test execution failure).
- **FR-017**: The CLI MUST perform graceful cleanup of all started background processes on exit, regardless of whether the run succeeded or failed.
- **FR-018**: The CLI MUST support both `android` and `ios` platforms.
- **FR-019**: The CLI MUST produce JUnit XML test result output compatible with standard CI reporting tools.
- **FR-020**: The CLI MUST generate a run summary file containing stage outcomes, timing, and artifact paths.
- **FR-021**: The `smoke.config.json` MUST be validated against a defined schema before execution; invalid configuration MUST produce a clear validation error.

#### Reusable CI Workflow Template

- **FR-022**: The CI template MUST be implemented as a GitHub Actions reusable workflow using `workflow_call`.
- **FR-023**: The workflow MUST accept input parameters for: platform selection, whether to start the backend, whether to upload artifacts, and timeout duration.
- **FR-024**: On test failure, the workflow MUST output an Error Summary to the GitHub Step Summary containing the failing stage, error context, and tail of relevant logs.
- **FR-025**: The workflow MUST upload test artifacts (JUnit XML, Maestro output, debug logs) as GitHub Actions artifacts when artifact upload is enabled.
- **FR-026**: The workflow MUST handle platform-specific runner requirements (macOS for iOS, Ubuntu for Android).

#### Cross-Cutting

- **FR-027**: The core CLI logic MUST be implemented in TypeScript to ensure consistent behavior across macOS and Linux.
- **FR-028**: Shell scripts MUST be limited to minimal entry-point shims that delegate to the TypeScript CLI.
- **FR-029**: The CLI MUST support both local (interactive) and CI (non-interactive) execution modes with appropriate output formatting for each.

### Technical Constraints *(mandatory)*

- **TC-001**: This feature does not add or modify Expo mobile app screens; TC-001 (Expo-managed RN), TC-002 (NativeWind), TC-003 (TanStack Query), TC-005 (loading/empty/error states), TC-007 (visual consistency), and TC-009 (Storybook) are not applicable.
- **TC-004**: CLI behavior MUST have Vitest coverage at the lowest practical layer. Configuration parsing, health check logic, log aggregation, and error summary formatting MUST be unit-tested.
- **TC-006**: Configuration schema definitions and validation logic SHOULD be implemented in a way that allows reuse across the CLI and the scaffold skill. The JSON Schema for `smoke.config.json` is the shared artifact.
- **TC-008**: The automated regression suite is `vitest` for CLI unit tests. The implementation plan MUST name the test files and coverage targets.
- **TC-010**: This feature does not modify backend application code; TC-010 through TC-015 (Python/backend constraints) are not applicable to the kit itself. The kit orchestrates existing backend services but does not alter them.

### Key Entities

- **Smoke Configuration** (`smoke.config.json`): The central configuration artifact for a project's smoke test setup. Contains app identity, directory paths, port assignments, health check definitions, artifact output paths, and flow file locations.
- **Health Check**: A service readiness probe defined by a port, an optional HTTP path, and a timeout. Used to verify that backend services and the Metro bundler are fully operational before test execution begins.
- **Smoke Run**: A single execution of the smoke test pipeline, identified by a unique run ID. Encompasses preflight, service startup, health checks, test execution, and cleanup. Produces artifacts (JUnit XML, logs, summary).
- **Flow Template**: A Maestro test flow file consisting of platform wrappers (one per platform) that delegate to a canonical flow skeleton. Platform wrappers inject platform-specific environment variables.
- **Error Summary**: A structured failure report generated when any pipeline stage fails. Contains the stage name, exit code, and the last 50 lines of associated log output. Rendered in the terminal (local mode) or GitHub Step Summary (CI mode).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can scaffold a complete smoke test structure into a new Expo project in under 5 minutes, with zero manual file creation or path editing required.
- **SC-002**: A developer can execute a full local smoke test run (preflight through cleanup) using a single CLI command, without needing to understand or modify orchestration scripts.
- **SC-003**: Service readiness is confirmed via port-based health checks; no test execution begins until all configured services respond successfully on their designated ports.
- **SC-004**: When any pipeline stage fails, the developer sees a structured Error Summary within 5 seconds of the failure, containing enough context (stage, exit code, last 50 log lines) to begin diagnosis without manually searching log files.
- **SC-005**: The CLI produces identical behavior on macOS and Linux for all supported commands, eliminating cross-OS shell compatibility issues.
- **SC-006**: A team can integrate the reusable CI workflow into their repository with no more than 10 lines of workflow YAML (the `uses:` call plus input parameters).
- **SC-007**: CLI unit tests cover configuration parsing, health check logic, log aggregation, and error summary formatting with at least 80% line coverage.
- **SC-008**: The scaffold process correctly auto-detects app identifiers from project configuration in at least the two supported project structures (root `app/` and nested `packages/<name>/` layouts).

## Assumptions

- The app build artifact (APK or iOS `.app`) is a pre-requisite and is produced outside the Smoke Kit. The kit does not handle app compilation or bundling.
- Target projects use Expo-managed React Native with TypeScript. Flutter, native iOS (Swift/ObjC), and native Android (Kotlin/Java) projects are explicitly out of scope.
- Backend services are either Node.js or Python-based and can be started via a shell command defined in `smoke.config.json`.
- Developers have Maestro CLI installed and available on `PATH`. The preflight command validates this.
- iOS smoke tests require macOS with Xcode and a booted simulator. Android smoke tests require a booted emulator accessible via `adb`.
- The project uses `pnpm` as its package manager, consistent with the existing monorepo convention.
- JUnit XML output format combined with GitHub Actions Step Summary is sufficient for test result reporting — no web UI dashboard is needed.
- The `smoke.config.json` schema will be versioned, with the initial version being `1.0`. Future schema changes will maintain backward compatibility or provide migration tooling.

## Scope Exclusions

- **Flutter, Native iOS, Native Android**: Only Expo / React Native projects with Node or Python backends are supported.
- **Web UI Dashboard**: Test results are reported via JUnit XML and GitHub Actions Step Summary. No custom web dashboard will be developed.
- **App Build Logic**: The kit orchestrates smoke tests against pre-built app artifacts. Building the app is the caller's responsibility.
- **Device/Emulator Management**: The kit validates that a device is available but does not create, configure, or manage emulators or simulators.
