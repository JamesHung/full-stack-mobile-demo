# Feature Specification: Fastlane CD Flow for APK Export

**Feature Branch**: `003-fastlane-apk-export`  
**Created**: 2025-03-24  
**Status**: Draft  
**Input**: User description: "Fastlane CD flow for APK export using existing keystore"

## Overview

This feature implements an automated continuous delivery (CD) workflow using fastlane to build, sign, and export Android APKs (Android Package files) with minimal manual intervention. The solution leverages the existing `my-release-key.keystore` file already present in the repository to sign production-ready APKs. This is an on-demand export tool, triggered when needed rather than continuous deployment to stores.

**Value Proposition**: Development and release teams can consistently build, sign, and export production-ready APKs without manual Gradle commands, keystore management worries, or tedious signing steps. This reduces human error, ensures reproducibility, and cuts APK export time from 10+ minutes to under 5 minutes.

## Design Decisions

This section documents key architectural and operational decisions made during spec clarification, including rationale and implementation implications.

### 1. Keystore Password Management Strategy

**Decision**: Use Fastlane's Credentials Manager (encrypted storage with one-time setup)

**Rationale**: 
- **Security**: Credentials manager provides encrypted local storage, safer than plain environment variables or manual prompt entry during CI.
- **UX**: One-time setup for developers; thereafter, credentials are stored securely and reused without re-entry.
- **CI/CD Flexibility**: While CI systems use environment variables, developers can leverage fastlane's encrypted cache for local builds.

**Implementation Details**:
- Local development: Run `fastlane credentials_manager` once to store keystore password, key alias, and key password securely.
- CI/CD environments: Continue using environment variables (`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`); fastlane will use them without prompting.
- The Fastfile will use `prompt` actions to request credentials from local developers, with fallback to environment variables in CI.

**Impact on Lanes**:
- `build_and_export_apk` (local): Prompts user for credentials first time; uses cached credentials on subsequent runs.
- `ci_export_apk` (CI): Reads credentials exclusively from environment variables; no interactive prompts.

---

### 2. CI/CD Platform Target

**Decision**: GitHub Actions only (for MVP)

**Rationale**:
- **Alignment**: Project already uses GitHub Actions for CI/CD workflows.
- **Simplicity**: Focusing on GitHub Actions reduces scope and allows for optimized integration (GitHub Secrets, artifact uploads).
- **Future Extension**: Lane design remains platform-agnostic; extending to GitLab CI or other systems requires minimal changes (only the `.github/workflows/` configuration).

**Implementation Details**:
- `.github/workflows/` contains a new workflow file (e.g., `build-and-export-apk.yml`) that triggers on tag push or manual dispatch.
- Workflow passes secrets (keystore password, key alias, key password) as environment variables to `fastlane ci_export_apk`.
- APK artifacts are uploaded to GitHub Actions artifacts or released to GitHub Releases for distribution.

**Impact**:
- Fastlane lanes themselves are CI-platform-agnostic; only the triggering mechanism is GitHub-specific.
- Documentation will include example GitHub Actions workflow for others to reference or adapt.

---

### 3. Version Bumping Strategy

**Decision**: No version bumping in lane; use version from app.json

**Rationale**:
- **Separation of Concerns**: Version management is a separate workflow concern; fastlane should not mutate version configuration.
- **Explicit Control**: Developers or CI pipelines manage version increments via explicit commits or separate version-bumping processes.
- **Simplicity**: Reduces complexity of fastlane configuration and avoids coordinating version state across multiple tools.

**Implementation Details**:
- Fastlane reads the app version and build number from `app/app.json` under `expo.version` and `expo.android.versionCode`.
- No automatic increment; if duplicate versions are detected, fastlane warns but proceeds (allowing developers to decide recovery).
- The APK filename includes the version and build number from `app.json`, e.g., `app-v1.0.0-build42-20250324.apk`.

**Impact on Requirements**:
- **FR-011** (version bumping) is refined: Fastlane does NOT auto-increment; it reads from app.json. Version management remains external.
- **FR-012** (duplicate prevention) is refined: Fastlane warns if an identical version/build number APK already exists but does not block the build.

---

### 4. APK Output Location

**Decision**: Single directory with overwrite; default output is `./android/app/build/outputs/apk/`

**Rationale**:
- **Simplicity**: Single output directory simplifies artifact location and CI integration; developers always know where to find the latest APK.
- **Gradle Alignment**: Matches default Gradle output paths, minimizing custom configuration.
- **Overwrite Behavior**: Acceptable for on-demand builds; release managers manually manage retention and backups if needed.

**Implementation Details**:
- APKs are written to `./android/app/build/outputs/apk/release/app-release-v<version>-build<num>-<timestamp>.apk`.
- The output directory is configurable via Fastfile variables but defaults to Gradle's standard path.
- Previous APK files are retained on disk; developers/CI are responsible for cleanup if desired.

**Impact**:
- **FR-006** is clarified: Filename includes version, build number, and timestamp; output defaults to `./android/app/build/outputs/apk/release/`.
- **SC-007** is clarified: Artifacts are named consistently, making them sortable and identifiable.

---

### 5. Failure Recovery & Retry Strategy

**Decision**: Fail immediately with clear error message; user retries manually

**Rationale**:
- **Transparency**: Users understand exactly what failed and why; no hidden retries or side effects.
- **Simplicity**: Avoids complex retry logic, backoff strategies, and partial-success states.
- **Operator Control**: Release managers and CI systems can decide when and how to retry (e.g., fix the underlying issue, then re-run).

**Implementation Details**:
- Fastlane lanes exit with a non-zero exit code immediately upon any failure (validation, build, signing).
- Error messages include:
  - The step that failed (validation, build, signing, output verification)
  - Root cause (e.g., keystore not found, build compilation error, network timeout)
  - Suggested remediation steps (e.g., "Create keystore using: keytool -genkey ...", "Fix build errors and retry")
- No automatic retries within fastlane; CI systems may wrap fastlane in retry logic if desired (external to this feature).

**Impact on Requirements**:
- **FR-009** and **SC-003** emphasize human-readable error messages with remediation steps.
- **TC-010** is reinforced: Non-zero exit code on all failures.
- **User story acceptance criteria** are refined to expect clear, actionable error messages rather than automatic recovery.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Release Manager Exports Production APK (Priority: P1)

A release manager needs to generate a production-ready APK for distribution to quality assurance or beta testers. Currently, this requires manual Gradle invocations, keystore password entry, and configuration of signing details. With fastlane, this should be a single command.

**Why this priority**: This is the core workflow and MVP. The ability to export a signed APK on demand is the primary value of the feature.

**Independent Test**: Can be fully tested by running a fastlane lane that exports a signed APK and verifying the resulting APK file is present, signed with the correct certificate, and installable on a test device.

**Acceptance Scenarios**:

1. **Given** a clean working directory with uncommitted changes, **When** the release manager runs the fastlane export command, **Then** the APK is built and exported to a configured output directory without requiring keystore password re-entry.
2. **Given** a correctly configured `my-release-key.keystore` file, **When** fastlane signs the APK, **Then** the resulting APK is verifiable with the same certificate and installable on Android devices.
3. **Given** a failed build (e.g., syntax error in source code), **When** fastlane attempts to export, **Then** a clear error message is shown with the underlying build error, and no unsigned APK is produced.

---

### User Story 2 - CI/CD Pipeline Exports APK Automatically (Priority: P2)

A CI/CD pipeline (e.g., GitHub Actions, GitLab CI) needs to trigger APK builds and exports automatically on certain events (e.g., tag push, release branch merge). Fastlane should provide a reusable lane that CI systems can call without managing Gradle or signing details directly.

**Why this priority**: This enables fully automated distribution workflows and reduces manual intervention further. It also sets the foundation for deployment to app stores in the future.

**Independent Test**: Can be tested by invoking the fastlane lane from a CI environment simulator and verifying the APK is exported and artifacts are available in a designated location.

**Acceptance Scenarios**:

1. **Given** a CI environment with the necessary environment variables set (e.g., keystore password), **When** the fastlane CI lane is triggered, **Then** the APK is built, signed, and stored in a CI-accessible artifact repository without interactive prompts.
2. **Given** environment variables are missing or invalid, **When** fastlane runs, **Then** it exits with a descriptive error and does not create a partial or unsigned APK.

---

### User Story 3 - Developer Builds APK Locally for Testing (Priority: P3)

A developer working on the app wants to generate a test APK locally to verify behavior on a physical device or emulator without publishing. Fastlane should simplify the local build process.

**Why this priority**: Nice-to-have convenience. Developers can still use Gradle directly; fastlane just makes it easier. This has lower priority than release workflows.

**Independent Test**: Can be tested by running a fastlane lane from a local development machine and verifying a test APK is generated and installable on a local device.

**Acceptance Scenarios**:

1. **Given** a developer machine with Fastlane and Android toolchain installed, **When** the developer runs a fastlane test build lane, **Then** a debug or test APK is generated in under 3 minutes.
2. **Given** a test APK has been generated, **When** the developer installs it on a local emulator or device, **Then** the app runs without errors.

---

### Edge Cases

- **What happens when the keystore file is missing or corrupted?** The build should fail gracefully with a clear error message pointing to the keystore file, not a cryptic signing error.
- **What happens when the keystore password is incorrect?** An error should be raised before attempting to build, not during the signing step after a full build.
- **What happens when the developer is offline or Gradle dependencies cannot be resolved?** The build should fail early with a network/dependency error, not silently produce an incomplete APK.
- **What happens if the app version or build number is not incremented?** The system should either auto-increment or warn the user; producing duplicate APKs with identical version numbers should be prevented or flagged.
- **What happens if fastlane is used before the Android native environment is properly set up (missing SDK, NDK, etc.)?** A pre-flight check should identify missing dependencies and provide setup guidance.
- **What happens when signing the APK with an expired keystore certificate?** An error should be raised during the fastlane validation phase, not after build completion.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a fastlane lane named `build_and_export_apk` that orchestrates the complete APK export workflow (build, sign, verify, output). The lane MUST accept credentials via fastlane credentials manager (for local builds) or environment variables (for CI/CD).
- **FR-002**: System MUST automatically detect and use the existing `my-release-key.keystore` file from the repository root for signing. Pre-build validation MUST confirm the keystore file exists, is readable, and contains the expected key alias.
- **FR-003**: System MUST accept keystore password, key alias, and key password as secure inputs via (a) fastlane credentials manager for local development, or (b) environment variables (`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`) in CI/CD environments. Credentials MUST NOT be exposed in logs or fastlane output.
- **FR-004**: System MUST validate the keystore file and credentials before building, ensuring the keystore exists, is readable, contains the expected key alias, and credentials are correct. Validation failures MUST halt the build immediately with a clear error message.
- **FR-005**: System MUST perform a Gradle clean build for the release variant and produce a signed APK artifact using `./gradlew assembleRelease` (or variant-specific task).
- **FR-006**: System MUST output the signed APK to `./android/app/build/outputs/apk/release/` with a human-readable filename including version, build number, and timestamp, e.g., `app-release-v1.0.0-build42-20250324.apk`. The output path is configurable but defaults to the Gradle standard path.
- **FR-007**: System MUST verify the generated APK is properly signed before marking the build as successful. Verification MUST use `apksigner verify` or equivalent tooling.
- **FR-008**: System MUST provide a fastlane lane named `ci_export_apk` that is CI/CD-friendly for GitHub Actions and similar systems. This lane MUST read all credentials from environment variables and produce zero interactive prompts.
- **FR-009**: System MUST log all major steps (validation, build start, signing, output) with timestamps for debugging and auditing. Logs MUST NOT expose keystore passwords or secrets.
- **FR-010**: System MUST provide a `validate_apk_setup` action that pre-flight checks all prerequisites (Android SDK, NDK, Gradle, keystore, certificates) and reports any missing dependencies with setup guidance.
- **FR-011**: System MUST NOT auto-increment versions. Fastlane reads the app version and build number from `app/app.json` under `expo.version` and `expo.android.versionCode`. Version bumping is a separate process; developers or CI must manage version increments explicitly.
- **FR-012**: System MUST warn (but not block) if a duplicate APK export is detected (same version and build number as an existing APK in the output directory). Recovery is operator-driven: bump the version in `app.json` and retry.
- **FR-013**: System MUST support both debug and release APK exports, with appropriate signing and output directories for each variant. Debug builds MUST only be generated when explicitly requested via a dedicated lane (e.g., `build_debug_apk`).

### Technical Constraints *(mandatory)*

- **TC-001**: Fastlane MUST be installed and available in the build environment as a Ruby Gem dependency (managed via Gemfile in the `app/` directory or bundled in CI via a Ruby version manager).
- **TC-002**: Fastlane actions MUST leverage the Gradle plugin (`gradle` action) to invoke the Android Gradle build system; no direct shell invocations of gradle commands.
- **TC-003**: Keystore password, key alias, and key password MUST be stored as (a) encrypted credentials in fastlane's credentials manager for local development, or (b) secure environment variables in GitHub Secrets for CI/CD. These MUST NEVER be hardcoded in Fastfiles, configuration files, or source code.
- **TC-004**: All keystore and certificate operations MUST use Fastlane's actions or native Gradle signing configuration; no manual jarsigner or keytool invocations outside of one-time keystore generation.
- **TC-005**: The Fastfile MUST be located at `app/fastlane/Fastfile` and MUST define at least three lanes: `build_and_export_apk` (local/manual), `ci_export_apk` (CI-friendly for GitHub Actions), and `validate_apk_setup` (pre-flight validation).
- **TC-006**: Fastlane actions MUST respect existing Gradle build system configuration (buildTypes, signing configs, variant names) and not create parallel build systems.
- **TC-007**: The generated APK artifact MUST be built with the release variant unless explicitly overridden; debug builds MUST only be generated when explicitly requested via `build_debug_apk` lane.
- **TC-008**: All error messages and warnings MUST be human-readable and include remediation steps (e.g., "Keystore file not found at [path]. Create it using: `keytool -genkey ...`"). Errors MUST be reported immediately, blocking further steps.
- **TC-009**: The fastlane setup MUST not require manual editing of build.gradle or app.json; all configuration MUST be in the Fastfile or environment variables.
- **TC-010**: Fastlane MUST exit with a non-zero exit code on any failure (validation, build, signing, artifact verification) to allow CI systems to detect and act on errors.
- **TC-011**: The Fastfile MUST include comprehensive inline documentation explaining each lane, action, parameter, and credential requirement for maintainability.
- **TC-012**: Fastlane MUST be added as a dependency in a `Gemfile` in the `app/` directory, with a `.ruby-version` file specifying the required Ruby version (3.0+) for consistency across dev and CI.
- **TC-013**: For local development, fastlane credentials manager MUST be initialized once via `fastlane credentials_manager` or equivalent, storing keystore credentials securely. Thereafter, `build_and_export_apk` MUST use cached credentials without re-entry on subsequent runs.

### Technical Integration Points

- **Android Gradle Build System**: Fastlane invokes the Gradle build system in the `app/android/` directory; integration MUST respect existing buildTypes, signingConfigs, and variant definitions.
- **Keystore Management**: The existing `my-release-key.keystore` file in the repository root is used for APK signing. Fastlane MUST locate and validate it before building, failing immediately if validation fails.
- **Expo Configuration**: The project is Expo-managed; fastlane MUST not interfere with Expo's Metro bundler or development workflows. APK builds are via the local Android toolchain (Gradle), not Expo's managed service. Version configuration is read from `app/app.json` (`expo.version`, `expo.android.versionCode`).
- **GitHub Actions CI/CD Integration**: Fastlane lanes (`ci_export_apk`) MUST be callable from GitHub Actions workflows. Credentials are passed via GitHub Secrets as environment variables. Workflow files are maintained in `.github/workflows/` and trigger on tag push or manual dispatch. APK artifacts are uploaded to GitHub Actions or released to GitHub Releases.
- **Local Development**: Developers using Android Studio or npm scripts in the `app/` directory may invoke fastlane via `npm run build:apk` (optional convenience script) or directly via `fastlane build_and_export_apk`. Traditional Gradle paths (e.g., `./gradlew assembleRelease`) remain fully functional.
- **Credential Management (Local)**: Developers initialize fastlane credentials once via `fastlane credentials_manager`, which securely stores keystore password, key alias, and key password. Subsequent runs of `build_and_export_apk` use cached credentials without re-entry.
- **Credential Management (CI/CD)**: GitHub Actions workflows read credentials from GitHub Secrets (stored securely at the repository or organization level) and pass them to `ci_export_apk` as environment variables (`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`). CI lanes do not use fastlane's credentials manager.

### Key Entities

- **Keystore File**: `my-release-key.keystore` (located at repository root). Holds the private key and certificate used to sign APKs. Accessed via keystore password, key alias, and key password.
- **APK Artifact**: Output file generated by the build process, containing compiled app code, resources, and signing certificate. Stored in `./android/app/build/outputs/apk/release/` with versioned filename (e.g., `app-release-v1.0.0-build42-20250324.apk`). Verified as properly signed before reporting success.
- **Fastlane Lane**: A named workflow defined in the Fastfile that orchestrates a series of actions. Three primary lanes: `build_and_export_apk` (local, credentials manager), `ci_export_apk` (CI, environment variables), and `validate_apk_setup` (validation).
- **Gradle Build**: The underlying Android build system that compiles the app, applies signing configs, and produces the APK. Fastlane acts as an orchestrator, invoking Gradle via the `gradle` action.
- **Fastlane Credentials Manager**: Local encrypted storage (on developer machines) for keystore credentials. Initialized once; subsequent fastlane runs retrieve stored credentials securely.
- **GitHub Secrets**: Repository-level secure environment variables for CI/CD, containing keystore password, key alias, and key password. Accessed by GitHub Actions workflows and passed to fastlane as environment variables.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: APK export time is reduced from 10+ minutes (manual Gradle + manual signing) to under 5 minutes (fastlane automated). Measured from `fastlane build_and_export_apk` start to APK file creation.
- **SC-002**: 100% of signed APKs generated via fastlane pass Android signature verification without errors. Verified using `apksigner verify`.
- **SC-003**: All fastlane error scenarios (missing keystore, incorrect password, build failure) are caught and reported with actionable remediation steps within 30 seconds of issue detection. Error messages MUST be human-readable and include setup commands.
- **SC-004**: Pre-flight validation (`validate_apk_setup` lane) completes in under 10 seconds and accurately identifies all missing or misconfigured prerequisites (Android SDK, NDK, Gradle, keystore, certificates).
- **SC-005**: Release managers can export a signed APK without consulting documentation—running `fastlane build_and_export_apk` after initial credential setup requires no additional input or keystore knowledge.
- **SC-006**: CI/CD pipelines can trigger APK export with zero interactive prompts using `fastlane ci_export_apk` and environment variables (GitHub Secrets). GitHub Actions workflow triggers reliably on tag push or manual dispatch.
- **SC-007**: All APK artifacts are named consistently with version, build number, and timestamp (e.g., `app-release-v1.0.0-build42-20250324.apk`), making them easily identifiable and sortable in artifact repositories and GitHub Releases.
- **SC-008**: Duplicate APK builds (same version/build number) are detected and warned about, prompting the user to bump the version in `app.json` before retrying.
- **SC-009**: Fastlane setup documentation and inline code comments are comprehensive enough that a new team member can understand the configuration, initialize credentials, and run lanes without external training.
- **SC-010**: All keystore and signing operations complete without exposing passwords or secrets in logs, stdout, or fastlane output. Credential masking MUST be verified in CI logs.
- **SC-011**: Local development with fastlane credentials manager allows developers to run `fastlane build_and_export_apk` repeatedly without re-entering keystore credentials; one-time setup via `fastlane credentials_manager` is sufficient.
- **SC-012**: GitHub Actions integration allows repository maintainers to trigger APK builds via tag push or manual dispatch; APK artifacts are available as GitHub Releases or downloadable from workflow run artifacts.

## Assumptions

- **Ruby Environment**: A compatible Ruby environment (3.0+) is available in the build and CI environments. Local development and CI systems can install Ruby via version managers (rbenv, asdf, etc.) or system packages.
- **Android Toolchain**: Android SDK, NDK, and Gradle are installed and configured in the development and CI environments. The `ANDROID_HOME` and `ANDROID_NDK_HOME` environment variables are set correctly.
- **Keystore Accessibility**: The `my-release-key.keystore` file remains in the repository root and is readable by the build process. The keystore has not been revoked or expired.
- **Gradle Configuration**: The existing Android Gradle configuration in `app/android/build.gradle` and `app/android/app/build.gradle` is sound and builds successfully via `./gradlew assembleRelease` without manual intervention.
- **Expo Build Flow**: APK builds are triggered via the local Android toolchain (Gradle), not Expo's managed service. Fastlane does not coordinate with EAS; it operates on the local Android project.
- **Version Management (Explicit)**: The app version in `app/app.json` is maintained explicitly by developers or a separate version-bumping workflow. Fastlane does NOT auto-increment versions; it reads and uses existing values. Developers bump versions manually in `app.json` before triggering APK exports.
- **Fastlane Credentials Manager (Local)**: On local development machines, fastlane credentials manager is initialized once via `fastlane credentials_manager`. This allows secure storage and reuse of keystore credentials without re-entry on subsequent `build_and_export_apk` runs.
- **GitHub Secrets (CI)**: In GitHub Actions workflows, keystore credentials (password, key alias, key password) are stored securely in GitHub Secrets at the repository or organization level. CI workflows retrieve these secrets and pass them to `ci_export_apk` as environment variables.
- **No Automatic Retries**: Fastlane lanes fail immediately upon error; no automatic retries occur within fastlane. Manual intervention is required to fix the underlying issue and re-run the lane.
- **Single Keystore**: The project uses a single release keystore (`my-release-key.keystore`) for all APK builds. If multiple keystores or key aliases are needed in the future, fastlane lanes can be extended.
- **GitHub Actions as CI/CD**: For MVP, CI/CD integration targets GitHub Actions exclusively. Credential passing, artifact upload, and triggering mechanisms are optimized for GitHub Actions. Extension to other CI/CD platforms (GitLab CI, CircleCI, etc.) is deferred to future work; fastlane lanes remain platform-agnostic.
- **No EAS Publish Integration**: The initial implementation exports APKs for distribution via direct download or GitHub Releases. Integration with Google Play Store or other distribution channels is out of scope.

## Testing & Validation Approach

### Unit & Integration Testing

- **Fastlane Lane Validation**: Each fastlane lane (`build_and_export_apk`, `ci_export_apk`, `validate_apk_setup`) is tested independently by invoking it locally and verifying output (success/failure, APK artifact, logs). Local lane testing uses fastlane credentials manager; CI lane testing uses environment variables.
- **Credentials Manager Testing**: Test that `build_and_export_apk` correctly stores and retrieves keystore credentials from fastlane's credentials manager on local machines. Verify credentials are not exposed in logs or output.
- **Environment Variable Handling**: Test that `ci_export_apk` accepts credentials via environment variables (`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`), does not expose them in logs, and fails gracefully if they are missing or invalid.
- **Keystore Validation**: Test that fastlane correctly rejects a missing, corrupted, or invalid keystore with a clear, actionable error message within 30 seconds, without attempting a build.
- **Build Artifact Verification**: Generated APK artifacts are verified using `apksigner verify` to confirm they are properly signed with the correct certificate and not corrupted.
- **Duplicate Detection**: Test that `build_and_export_apk` detects when an APK with identical version and build number already exists in the output directory, warns the user with remediation steps, and allows manual retry after version bump.

### Regression Testing

- **Gradle Compatibility**: Verify that fastlane does not interfere with existing Gradle builds. Running `./gradlew assembleRelease` directly should still work and produce APKs with identical signing to fastlane builds (modulo timestamp metadata).
- **Expo Development Flow**: Confirm that adding fastlane to the project does not break Expo development workflows (`expo start`, hot reloading, metro bundler).
- **Version Consistency**: Verify that `build_and_export_apk` and `ci_export_apk` read and use the same version/build number from `app/app.json`, producing consistently named APK artifacts.

### CI/CD Integration Testing

- **GitHub Actions Integration**: Test fastlane lanes in a GitHub Actions runner (e.g., ubuntu-latest) to verify they work without interactive prompts and exit with correct status codes. Test credential passing via GitHub Secrets.
- **Credential Masking**: Verify that GitHub Actions logs mask secret values (keystore password, key alias, key password) when passed as environment variables to `ci_export_apk`.
- **APK Artifact Upload**: Test that GitHub Actions workflow successfully uploads the generated APK to GitHub Releases or workflow artifacts, making them downloadable for distribution.
- **Trigger Mechanisms**: Test that GitHub Actions workflow triggers correctly on tag push and manual dispatch (`workflow_dispatch`).

### User Acceptance Testing

- **Release Manager Workflow (Local)**: A release manager initializes fastlane credentials manager once (`fastlane credentials_manager`), then runs `fastlane build_and_export_apk`. Verify the APK is exported to the expected output directory without additional prompts on subsequent runs.
- **Developer Convenience**: A developer runs `fastlane build_and_export_apk` and successfully installs the generated APK on a local emulator or device without errors.
- **Error Recovery**: When an error occurs (e.g., missing keystore, incorrect password, build failure), the user receives a clear, actionable error message with remediation steps. Verify the user can fix the issue and successfully retry.
- **CI/CD Trigger**: Repository maintainers push a git tag or trigger the workflow manually; the GitHub Actions workflow runs `fastlane ci_export_apk`, and the APK is available as a GitHub Release or artifact within 5 minutes.

## Out of Scope

- **Google Play Store Integration**: Uploading APKs to the Google Play Store, release track management, or store metadata publishing. Future work may extend fastlane to support this via the `upload_to_play_store` action.
- **iOS Build & Distribution**: This feature is Android-specific; iOS APK equivalent (IPA) builds are not included. An equivalent fastlane setup for iOS may be added as a separate feature.
- **Build Caching & Optimization**: While fastlane may benefit from Gradle caching, detailed optimization of build times is deferred to future work.
- **Fastlane Plugins & Extensions**: Custom fastlane plugins for project-specific integrations. Only standard fastlane actions are used unless a proven public plugin is available.
- **Multi-Keystore Support**: The initial implementation supports a single release keystore. Support for multiple keystores, key aliases, or distribution channels is deferred to future work.
- **CI/CD Platforms Beyond GitHub Actions**: Integration with GitLab CI, CircleCI, Buildkite, or other CI/CD systems is out of scope for MVP. Fastlane lanes are platform-agnostic and can be adapted by other systems; only GitHub Actions integration is initially documented.
