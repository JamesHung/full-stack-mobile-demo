# Implementation Plan: Fastlane CD Flow for APK Export

**Branch**: `003-fastlane-apk-export` | **Date**: 2025-03-24 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-fastlane-apk-export/spec.md`

**Note**: This implementation plan covers the Fastlane-based APK export workflow, including lane design, credentials management, GitHub Actions integration, and validation strategy.

## Summary

The feature implements an automated continuous delivery (CD) workflow using **Fastlane** to build, sign, and export production-ready Android APKs with minimal manual intervention. The solution leverages the existing `my-release-key.keystore` file to sign APKs, provides secure credential management via Fastlane's credentials manager (local development) and GitHub Secrets (CI/CD), and supports both manual and automated APK exports. The workflow reads version and build number from `app/app.json` (Expo config), validates prerequisites, executes a Gradle clean release build, verifies signatures, and outputs timestamped APK artifacts to a consistent directory structure.

**Core Lanes**:
- `build_and_export_apk` — Local release manager flow with credentials manager prompts
- `ci_export_apk` — GitHub Actions CI/CD flow with environment variable credentials
- `validate_apk_setup` — Pre-flight validation of Android SDK, NDK, Gradle, keystore, and certificates

**Value Proposition**: Development and release teams can export production-ready APKs in under 5 minutes without manual Gradle commands, keystore password management, or signing complexity. The solution reduces human error, ensures reproducibility, and integrates seamlessly with GitHub Actions for automated release workflows.

---

## Technical Context

**Language/Version**: Ruby (Fastlane automation); Android Gradle build system (Java/Kotlin compilation); Expo configuration (app/app.json) for version management.

**Primary Dependencies**:
- **Fastlane** (Ruby Gem) — workflow orchestration
- **Gradle** (Android build system) — APK compilation and signing
- **Android SDK/NDK** — native toolchain (existing project dependency)
- **apksigner** (Android build tools) — APK signature verification
- **Keystore file** (`my-release-key.keystore`) — private key and certificate for signing

**Storage**: No persistent data storage required. APK artifacts written to `./android/app/build/outputs/apk/release/` with version-stamped filenames.

**Testing**: 
- **Pre-flight validation** — Fastlane actions verify prerequisites before build
- **Build validation** — Gradle compilation success and artifact creation
- **Signing verification** — `apksigner verify` confirms APK is properly signed
- **Manual testing** — Test on emulator/device to confirm app runs after install

**Target Platform**: Android (ARM64, ARMv7 support via Gradle configuration; iOS out of scope).

**Project Type**: Mobile app (Expo-managed React Native); Fastlane orchestrates native Android build toolchain without interfering with Expo Metro or development workflows.

**Performance Goals**: 
- APK export time **under 5 minutes** (Gradle build + signing + verification)
- Pre-flight validation **under 10 seconds**
- Error detection and reporting **within 30 seconds** of issue occurrence

**Constraints**:
- No automatic retries — operator-driven recovery (developer/CI manually bumps version and retries)
- Single keystore design — only `my-release-key.keystore` used for production signing
- No version auto-increment — developers/CI manage version explicitly via `app.json` updates
- GitHub Actions primary platform (MVP) — extensible to GitLab CI, Jenkins, etc. with workflow-only changes

**Scale/Scope**: Single release lane; no multi-lane orchestration or matrix builds (can be extended post-MVP).

**Visual Regression**: N/A — feature is infrastructure/build automation, no UI changes.

**Backend API Docs**: N/A — feature is local/CI build automation, no backend API introduced.

---

## Constitution Check

✅ **GATE PASS — Pre-Phase 0**

- **Mobile Baseline**: Expo-managed React Native baseline preserved. APK builds leverage native Android toolchain (Gradle); no changes to Expo Metro, development workflows, or app code structure.
- **Build Tooling**: Android build system (Gradle) is the native compilation platform; no Python backend work introduced.
- **Shared Logic**: No shared validation or type modules required — feature is build infrastructure.
- **Boundaries**: Fastlane lanes act as orchestrators; no new TypeScript APIs, Pydantic models, or cross-platform business logic introduced.
- **Testing**: Pre-flight validation and signature verification are built into lanes; no Vitest or pytest coverage required (build automation, not product logic).
- **UI Changes**: None — feature is build infrastructure.
- **Styling**: N/A — no UI work.
- **Server State**: N/A — no remote data flows.
- **Secrets Management**: Keystore credentials stored in Fastlane credentials manager (local) or GitHub Secrets (CI) — no hardcoded credentials in source.
- **Logging & Exceptions**: Fastlane logs all steps; errors are human-readable with remediation steps. No custom exception classes required.
- **API Documentation**: N/A — no new API endpoints.

**Constitution Compliance**: ✅ Fully compliant. Feature is infrastructure automation; no deviations from Expo-managed React Native baseline, no backend runtime required, no shared-logic duplication, no TypeScript/Pydantic boundaries affected.

---

## Project Structure

### Documentation (this feature)

```
specs/003-fastlane-apk-export/
├── spec.md                    # Feature specification (input)
├── plan.md                    # This file (planning output)
├── research.md                # Phase 0: Dependency research, best practices
├── data-model.md              # Phase 1: Configuration entities, version management
├── quickstart.md              # Phase 1: Setup and invocation guides
├── contracts/                 # Phase 1: Interface contracts (APK artifact format, lane signatures)
│   ├── apk-artifact.md        # APK output filename format and verification contract
│   ├── fastlane-lanes.md      # Lane interface definitions (inputs, outputs, errors)
│   └── ci-integration.md      # GitHub Actions workflow contract
└── tasks.md                   # Phase 2: Actionable implementation tasks (generated by /speckit.tasks)
```

### Source Code (repository root)

```
app/
├── fastlane/
│   ├── Fastfile               # Main orchestration (3 primary lanes)
│   ├── actions/
│   │   ├── validate_apk_setup.rb       # Pre-flight checks
│   │   ├── read_app_version.rb         # Read Expo config (app.json)
│   │   ├── verify_keystore.rb          # Validate keystore + credentials
│   │   ├── build_release_apk.rb        # Gradle assembleRelease orchestration
│   │   ├── verify_apk_signature.rb     # Post-build signature verification
│   │   ├── check_duplicate_apk.rb      # Warn if version already exported
│   │   └── prepare_output_apk.rb       # Rename and prepare final artifact
│   ├── .env.default           # Template for local .env (credentialsmanager init)
│   └── README.md              # Fastlane setup and usage guide
├── Gemfile                    # Ruby dependency management (Fastlane + plugins)
├── Gemfile.lock               # Pinned gem versions
├── .ruby-version              # Ruby version (3.0+)
├── android/
│   └── app/
│       ├── build.gradle       # [EXISTING] Gradle build config (signing config updated if needed)
│       └── build/
│           └── outputs/
│               └── apk/
│                   └── release/
│                       └── app-release-v1.0.0-build42-*.apk    # Output APK
└── app.json                   # [EXISTING] Expo config (version & versionCode source)

.github/
├── workflows/
│   └── build-and-export-apk.yml         # GitHub Actions CI/CD trigger workflow
└── secrets/
    ├── KEYSTORE_PASSWORD     # (configured in repo settings, not committed)
    ├── KEY_ALIAS             # (configured in repo settings, not committed)
    └── KEY_PASSWORD          # (configured in repo settings, not committed)

root/
├── my-release-key.keystore   # [EXISTING] Release signing key
└── package.json              # [UPDATED] New npm script: build:apk
```

---

## Architecture & Directory Structure

### Fastlane Directory Layout

The feature introduces a **`app/fastlane/`** directory containing all Fastlane-specific configuration and custom actions. This structure keeps Fastlane setup isolated from app code and makes it easy to version-control and maintain.

```
app/fastlane/
├── Fastfile                           # Main lane definitions
├── actions/                           # Custom Fastlane actions
│   ├── validate_apk_setup.rb
│   ├── read_app_version.rb
│   ├── verify_keystore.rb
│   ├── build_release_apk.rb
│   ├── verify_apk_signature.rb
│   ├── check_duplicate_apk.rb
│   └── prepare_output_apk.rb
├── .env.default                       # Template for credentials init
├── README.md                          # Setup and usage docs
└── [future] plugins/                  # Custom plugins if needed (MVP: none)
```

**Key Points**:
- **Fastfile** orchestrates lanes; each lane combines actions (either built-in Fastlane actions or custom Ruby modules)
- **Actions** are reusable Ruby modules that encapsulate specific logic (validation, build, signing, verification)
- **.env.default** is a template showing developers what credentials to store (not committed)
- **README.md** provides local setup instructions, troubleshooting, and examples

### Gradle Integration Points

Fastlane does not modify `build.gradle` or override Gradle configuration. Instead, it orchestrates the existing Gradle build system:

1. **Gradle Build Invocation**: `fastlane` uses the built-in `gradle` action to invoke `./gradlew assembleRelease`
2. **Signing Configuration**: Gradle's `signingConfigs` in `build.gradle` define keystore path, alias, and passwords (Fastlane supplies credentials via environment variables or credentials manager)
3. **Build Variant**: Fastlane targets the `release` build variant by default; debug and test variants can be built via dedicated lanes (e.g., `build_debug_apk`)
4. **Output Path**: Gradle writes APK to `app/build/outputs/apk/release/` (standard Gradle structure); Fastlane reads from this directory and renames the artifact

**Gradle Configuration Required** (in `app/android/app/build.gradle`):
```groovy
// Ensure signingConfigs block exists and is referenced in release buildType
signingConfigs {
    release {
        storeFile file("../../my-release-key.keystore")  // Path to keystore
        storePassword System.getenv("KEYSTORE_PASSWORD") ?: "placeholder"
        keyAlias System.getenv("KEY_ALIAS") ?: "placeholder"
        keyPassword System.getenv("KEY_PASSWORD") ?: "placeholder"
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        // ... other release config
    }
}
```

Fastlane ensures environment variables are set before invoking Gradle; Gradle reads them from the environment during build.

### Keystore and Credentials Manager Setup

**Local Development Flow**:
1. Developer runs `fastlane credentials_manager` (one-time setup) to securely store keystore password, key alias, and key password in Fastlane's encrypted cache
2. Fastlane credentials manager encrypts credentials and stores them locally (typically in `~/.fastlane/credentials.json` or similar)
3. On subsequent runs of `build_and_export_apk`, credentials are retrieved from the cache without re-entry

**CI/CD (GitHub Actions) Flow**:
1. Repository administrator configures GitHub Secrets: `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`
2. GitHub Actions workflow passes secrets as environment variables to `fastlane ci_export_apk`
3. Fastlane lane reads credentials from environment variables; no credentials manager interaction in CI

**Security Considerations**:
- Keystore passwords are never logged or exposed in fastlane output
- Local credentials are encrypted by Fastlane's credentials manager
- CI credentials are stored in GitHub Secrets (encrypted at rest, visible only to authorized workflows)
- Keystore file itself (`my-release-key.keystore`) is committed to the repository (contains private key, but is password-protected)

---

## Lane Design & Orchestration

### Primary Lanes (Core Workflow)

#### 1. **`build_and_export_apk`** — Local Release Manager Flow

**Purpose**: Allow release managers and developers to export production-ready APKs on demand from a local machine.

**Inputs**:
- Optional: `version` (if not provided, read from `app.json`)
- Optional: `build_number` (if not provided, read from `app.json`)
- Credentials: Keystore password, key alias, key password (from credentials manager on first run; cached thereafter)

**Outputs**:
- ✅ Signed APK file: `./android/app/build/outputs/apk/release/app-release-v{version}-build{num}-{timestamp}.apk`
- ✅ Console message: "APK exported successfully to [path]"
- ✅ Verification: APK is signature-verified

**Error Handling**:
- If keystore not found → "Keystore file not found at [path]. Ensure `my-release-key.keystore` exists at repository root."
- If credentials missing or incorrect → "Keystore credentials invalid. Run `fastlane credentials_manager` to update stored credentials."
- If Gradle build fails → Show underlying build error; suggest fix and retry
- If signature verification fails → "APK signature verification failed. Build may be corrupted. Please retry."
- Non-zero exit code on any failure

**Lane Pseudocode**:
```ruby
lane :build_and_export_apk do
  # Step 1: Read app version and build number
  version = read_app_version(version: options[:version])
  build_num = read_app_build_number(build_number: options[:build_number])
  
  # Step 2: Pre-flight validation
  validate_apk_setup()
  
  # Step 3: Get credentials (from credentials manager or prompt)
  keystore_password = prompt(text: "Enter keystore password: ", secure_text: true)
  key_alias = prompt(text: "Enter key alias: ") # or retrieve from cached credentials
  key_password = prompt(text: "Enter key password: ", secure_text: true)
  
  # Step 4: Verify keystore and credentials
  verify_keystore(
    keystore_path: "../my-release-key.keystore",
    password: keystore_password,
    alias: key_alias
  )
  
  # Step 5: Check for duplicate APK (warn if exists)
  check_duplicate_apk(
    version: version,
    build_number: build_num,
    output_dir: "android/app/build/outputs/apk/release/"
  )
  
  # Step 6: Gradle clean build (release variant)
  gradle(
    project_dir: "android/",
    task: "clean assembleRelease",
    properties: {
      "KEYSTORE_PASSWORD" => keystore_password,
      "KEY_ALIAS" => key_alias,
      "KEY_PASSWORD" => key_password
    }
  )
  
  # Step 7: Verify APK signature
  verify_apk_signature(
    apk_path: "android/app/build/outputs/apk/release/app-release.apk",
    keystore_path: "../my-release-key.keystore",
    password: keystore_password,
    alias: key_alias
  )
  
  # Step 8: Rename and prepare final artifact
  final_apk = prepare_output_apk(
    source: "android/app/build/outputs/apk/release/app-release.apk",
    version: version,
    build_number: build_num,
    output_dir: "android/app/build/outputs/apk/release/"
  )
  
  # Step 9: Report success
  UI.success("✅ APK exported successfully to #{final_apk}")
end
```

---

#### 2. **`ci_export_apk`** — GitHub Actions CI/CD Flow

**Purpose**: Provide a CI/CD-friendly lane for GitHub Actions (and similar systems) to export APKs automatically without interactive prompts.

**Inputs**:
- Environment variables (required):
  - `KEYSTORE_PASSWORD`
  - `KEY_ALIAS`
  - `KEY_PASSWORD`
  - Optional: `VERSION` (if not provided, read from `app.json`)
  - Optional: `BUILD_NUMBER` (if not provided, read from `app.json`)

**Outputs**:
- ✅ Signed APK file: `./android/app/build/outputs/apk/release/app-release-v{version}-build{num}-{timestamp}.apk`
- ✅ Console message (logged to GitHub Actions): "APK exported successfully to [path]"
- ✅ Non-zero exit code on failure (for GitHub Actions to detect failure)

**Error Handling** (identical to `build_and_export_apk`):
- All steps include validation; failures exit immediately with descriptive error messages and setup guidance
- No interactive prompts; all input from environment variables
- If any required environment variable is missing, exit immediately with "Missing environment variable: [VAR_NAME]. Configure in GitHub Secrets."

**Lane Pseudocode**:
```ruby
lane :ci_export_apk do
  # Step 1: Read app version and build number
  version = ENV["VERSION"] || read_app_version()
  build_num = ENV["BUILD_NUMBER"] || read_app_build_number()
  
  # Step 2: Pre-flight validation
  validate_apk_setup(ci_mode: true)
  
  # Step 3: Load credentials from environment (no prompts)
  keystore_password = ENV["KEYSTORE_PASSWORD"] || 
    UI.user_error!("Missing environment variable: KEYSTORE_PASSWORD. Configure in GitHub Secrets.")
  key_alias = ENV["KEY_ALIAS"] ||
    UI.user_error!("Missing environment variable: KEY_ALIAS. Configure in GitHub Secrets.")
  key_password = ENV["KEY_PASSWORD"] ||
    UI.user_error!("Missing environment variable: KEY_PASSWORD. Configure in GitHub Secrets.")
  
  # Steps 4-9: Identical to build_and_export_apk
  verify_keystore(...)
  check_duplicate_apk(...)
  gradle(...)
  verify_apk_signature(...)
  final_apk = prepare_output_apk(...)
  
  # Step 10: Report success to GitHub Actions logs
  UI.success("✅ APK exported successfully to #{final_apk}")
end
```

---

#### 3. **`validate_apk_setup`** — Pre-flight Validation

**Purpose**: Check that all prerequisites are installed and configured before attempting a build.

**Inputs**:
- Optional: `ci_mode: false` (set to `true` for non-interactive CI/CD runs)

**Outputs**:
- ✅ "Pre-flight checks passed. Ready to build APK."
- ❌ Error with remediation steps for any missing prerequisite

**Validation Checks**:
1. **Android SDK installed**: Check `$ANDROID_HOME` environment variable; list installed API levels
2. **Android NDK installed**: Check `$ANDROID_NDK` or `$ANDROID_HOME/ndk/` for NDK binaries
3. **Gradle installed**: Run `./gradlew --version` in `android/` directory
4. **Keystore file exists**: Check `../../my-release-key.keystore` exists and is readable
5. **Keystore valid**: Use `keytool -list -v -keystore [path]` to confirm keystore is readable (requires password)
6. **Java version**: Confirm Java 11+ installed for Gradle and signing tools
7. **Gradle-specific tooling**: Check `apksigner` is available (Android build tools)

**Lane Pseudocode**:
```ruby
lane :validate_apk_setup do |options|
  ci_mode = options[:ci_mode] || false
  
  UI.header("Running pre-flight APK setup validation...")
  
  # Check Android SDK
  UI.message("✓ Checking Android SDK...")
  android_home = ENV["ANDROID_HOME"]
  UI.user_error!("ANDROID_HOME not set. Install Android SDK and set ANDROID_HOME environment variable.") unless android_home
  
  # Check Android NDK
  UI.message("✓ Checking Android NDK...")
  ndk_available = File.exist?("#{android_home}/ndk") || ENV["ANDROID_NDK"]
  UI.user_error!("Android NDK not found. Install NDK and set ANDROID_NDK environment variable.") unless ndk_available
  
  # Check Gradle
  UI.message("✓ Checking Gradle...")
  gradle_version = sh("cd android && ./gradlew --version 2>&1").strip
  UI.user_error!("Gradle not available. Ensure ./gradlew wrapper exists in android/ directory.") unless gradle_version.include?("Gradle")
  
  # Check keystore
  UI.message("✓ Checking keystore file...")
  keystore_path = File.expand_path("../../my-release-key.keystore", __dir__)
  UI.user_error!("Keystore file not found at #{keystore_path}. Create using: `keytool -genkey -v ...`") unless File.exist?(keystore_path)
  
  # Check Java
  UI.message("✓ Checking Java version...")
  java_version = sh("java -version 2>&1").strip
  UI.user_error!("Java 11+ not found. Install JDK and add to PATH.") unless java_version.include?("11") || java_version.include?("17") || java_version.include?("21")
  
  # Check apksigner
  UI.message("✓ Checking apksigner...")
  apksigner_path = "#{android_home}/build-tools"
  UI.user_error!("apksigner not found in Android build tools. Ensure build-tools are installed.") unless File.exist?(apksigner_path)
  
  UI.success("✅ Pre-flight validation passed. Ready to build APK.")
end
```

---

### Supporting Lanes (Optional Convenience)

#### 4. **`build_debug_apk`** — Debug Build (Optional)

**Purpose**: Generate a debug APK for local testing (not production-ready).

**Behavior**:
- Invokes `./gradlew assembleDebug` (does not require production keystore)
- Outputs to `android/app/build/outputs/apk/debug/`
- No signature verification (debug APK signed with debug key)

---

## Credentials & Secrets Management

### Fastlane Credentials Manager (Local Development)

**One-time Setup** (per developer machine):
```bash
cd app/
fastlane credentials_manager
```

Fastlane credentials manager provides an interactive prompt:
- **Keystore Password**: Stored encrypted locally
- **Key Alias**: Stored encrypted locally
- **Key Password**: Stored encrypted locally

Credentials are saved in `~/.fastlane/credentials.json` (encrypted).

**Subsequent Runs**: `build_and_export_apk` retrieves credentials from the encrypted cache; if cached credentials have expired or are invalid, the lane prompts for re-entry.

**Advantages**:
- ✅ Developers don't re-enter passwords on every build
- ✅ Credentials encrypted locally (not in shell history or config files)
- ✅ Easy to update credentials if keystore password changes

---

### GitHub Secrets Configuration (CI/CD)

**Setup Steps** (repository administrator or maintainer):

1. **Navigate to GitHub repository settings** → Secrets and variables → Actions
2. **Create three secrets**:
   - `KEYSTORE_PASSWORD` = (value of keystore password)
   - `KEY_ALIAS` = (e.g., "my-release-key-alias")
   - `KEY_PASSWORD` = (password for private key within keystore)

3. **GitHub Actions workflow** (`.github/workflows/build-and-export-apk.yml`) references secrets:
   ```yaml
   env:
     KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
     KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
     KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
   ```

**Security**:
- ✅ Secrets encrypted at rest in GitHub
- ✅ Only exposed to authorized workflows and actors
- ✅ Not visible in logs or GitHub CLI outputs
- ✅ Automatic redaction in GitHub Actions logs

---

### Credential Flow Comparison

| Aspect | Local Development | GitHub Actions CI/CD |
|--------|-------------------|----------------------|
| **Credential Storage** | Fastlane credentials manager (encrypted local cache) | GitHub Secrets (encrypted, server-side) |
| **Initialization** | `fastlane credentials_manager` (one-time) | Repository admin configures secrets (one-time) |
| **Lane Usage** | `fastlane build_and_export_apk` (prompts if no cache) | `fastlane ci_export_apk` (reads env vars; no prompts) |
| **Security** | Encrypted locally; requires developer machine access | Encrypted server-side; limited to authorized workflows |
| **Re-entry** | Only if credentials expire or user clears cache | Not applicable (always from GitHub Secrets) |
| **Fallback** | User can manually provide credentials if cache lost | None — CI fails if secrets missing |

---

## Output & Artifacts

### APK Output Path

**Default Location**: `./android/app/build/outputs/apk/release/`

**Filename Format**: `app-release-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk`

**Example**:
```
app-release-v1.0.0-build42-20250324T143022Z.apk
```

**Naming Rationale**:
- **Version** (`v1.0.0`): Matches Expo config (`app.json` → `expo.version`)
- **Build Number** (`build42`): Matches Expo config (`app.json` → `expo.android.versionCode`)
- **Timestamp** (`20250324T143022Z`): ISO 8601 UTC timestamp; ensures uniqueness even if version/build reused

**Output Directory Configurability**:
Fastlane lanes accept an optional `output_dir` parameter to customize the output path:
```bash
fastlane build_and_export_apk output_dir:"/path/to/release-artifacts"
```

This allows CI/CD pipelines to write APKs to different directories if needed (e.g., artifact servers, release buckets).

---

### Verification & Signing Checks

**Signature Verification** (occurs post-build):
```bash
apksigner verify \
  --print-certs \
  app-release-v1.0.0-build42-20250324.apk
```

**Verification confirms**:
- ✅ APK is properly signed with the release key
- ✅ Certificate matches the keystore certificate
- ✅ APK has not been modified since signing

**Output**:
```
Verifies
Signer #1 certificate DN: CN=Release Key, O=Company, C=US
Signer #1 certificate SHA-256 digest: [hash]
```

**Failure Handling**:
If signature verification fails, the lane reports an error:
```
ERROR: APK signature verification failed.
The APK file [path] does not have a valid signature.
This may indicate:
  - Build corruption
  - Keystore password mismatch
  - Gradle signing config error

Remediation:
  1. Clean Gradle build: ./gradlew clean
  2. Verify keystore credentials: fastlane credentials_manager
  3. Retry: fastlane build_and_export_apk
```

---

## Integration with Existing Codebase

### Reading Version from `app/app.json`

The Expo configuration file (`app/app.json`) is the single source of truth for version and build number:

```json
{
  "expo": {
    "name": "Voice Notes Summary",
    "slug": "voice-notes-summary",
    "version": "1.0.0",
    "android": {
      "versionCode": 42,
      "package": "com.demo.voicenotes"
    }
  }
}
```

**Fastlane Action** (`read_app_version.rb`):
```ruby
def read_app_version(options)
  app_json_path = File.expand_path("../../app.json", __dir__)
  app_config = JSON.parse(File.read(app_json_path))
  
  options[:version] || app_config["expo"]["version"] ||
    UI.user_error!("Version not found in app.json. Ensure 'expo.version' is set.")
end

def read_app_build_number(options)
  app_json_path = File.expand_path("../../app.json", __dir__)
  app_config = JSON.parse(File.read(app_json_path))
  
  options[:build_number] || app_config["expo"]["android"]["versionCode"] ||
    UI.user_error!("Version code not found in app.json. Ensure 'expo.android.versionCode' is set.")
end
```

**Workflow**:
1. Before exporting, developer updates `app.json`:
   ```json
   {
     "expo": {
       "version": "1.0.1",
       "android": {
         "versionCode": 43
       }
     }
   }
   ```

2. Developer commits version bump: `git commit -am "chore: bump version to 1.0.1 (build 43)"`
3. Developer (or CI) runs `fastlane build_and_export_apk`, which reads version from `app.json`
4. APK is generated with name: `app-release-v1.0.1-build43-20250324T143022Z.apk`

---

### Gradle Build Configuration

**Existing `build.gradle` Requirements**:

The `app/android/app/build.gradle` must define:
1. A release `buildType` with signing configuration
2. A `signingConfigs` block that references keystore and credentials

**Minimal `build.gradle` Example**:
```groovy
android {
  compileSdk 34
  
  signingConfigs {
    release {
      storeFile file("../../my-release-key.keystore")
      storePassword System.getenv("KEYSTORE_PASSWORD") ?: "placeholder"
      keyAlias System.getenv("KEY_ALIAS") ?: "placeholder"
      keyPassword System.getenv("KEY_PASSWORD") ?: "placeholder"
    }
  }
  
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
    debug {
      debuggable true
    }
  }
}
```

**Fastlane Gradle Task Invocation**:
```ruby
gradle(
  project_dir: "android/",
  task: "clean assembleRelease",
  properties: {
    "KEYSTORE_PASSWORD" => keystore_password,
    "KEY_ALIAS" => key_alias,
    "KEY_PASSWORD" => key_password
  }
)
```

Fastlane passes credentials as environment variables, which Gradle reads via `System.getenv()`.

**Important**: No modifications to `build.gradle` signing config are required if environment variables are already used. Fastlane simply supplies the values.

---

### CI/CD Hooks (GitHub Actions)

**Workflow File** (`.github/workflows/build-and-export-apk.yml`):

```yaml
name: Build and Export APK

on:
  workflow_dispatch:  # Manual trigger
    inputs:
      ref:
        description: 'Git ref (branch, tag, or commit SHA)'
        required: false
        default: 'main'
  push:
    tags:
      - 'v*'  # Trigger on version tags like v1.0.0

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.ref || github.ref }}

      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.1'
          bundler-cache: true
          working-directory: app

      - name: Install Fastlane gems
        working-directory: app
        run: bundle install

      - name: Export APK via Fastlane
        working-directory: app
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: fastlane ci_export_apk

      - name: Upload APK to GitHub Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: apk
          path: app/android/app/build/outputs/apk/release/

      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          draft: false
          prerelease: false

      - name: Upload APK to GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: app/android/app/build/outputs/apk/release/app-release-*.apk
          asset_name: voice-notes-summary-${{ github.ref_name }}.apk
          asset_content_type: application/vnd.android.package-archive
```

**Trigger Scenarios**:
1. **Manual Dispatch**: Repository maintainer triggers via GitHub Actions UI, specifying a Git ref (branch, tag, or commit)
2. **Tag Push**: When a version tag (e.g., `v1.0.0`) is pushed, GitHub Actions automatically exports the APK and creates a release

---

### Package.json Convenience Scripts

**Update `app/package.json`** to add build convenience scripts:

```json
{
  "scripts": {
    "build:apk": "cd app && fastlane build_and_export_apk",
    "build:apk:debug": "cd app && fastlane build_debug_apk",
    "validate:apk": "cd app && fastlane validate_apk_setup"
  }
}
```

**Usage**:
```bash
# From project root
npm run build:apk              # Export production APK
npm run build:apk:debug       # Export debug APK
npm run validate:apk          # Check prerequisites

# Or from app/ directory
fastlane build_and_export_apk
fastlane build_debug_apk
fastlane validate_apk_setup
```

---

## GitHub Actions Integration

### Workflow Design Principles

1. **Trigger Options**: Support manual dispatch and automated tag-push triggers
2. **Secrets Injection**: Use GitHub Secrets for all sensitive credentials
3. **Artifact Management**: Upload APK to GitHub Actions artifacts and GitHub Releases
4. **Error Reporting**: Fail fast with clear error messages for CI debugging

### Workflow Stages

**Stage 1: Setup**
- Checkout code
- Install Java 17
- Install Ruby 3.1+
- Install Fastlane dependencies

**Stage 2: Build**
- Invoke `fastlane ci_export_apk` with secrets as environment variables
- Fastlane validates, builds, signs, and verifies APK

**Stage 3: Artifact Upload**
- Upload APK to GitHub Actions artifacts (available for 90 days)
- If tag-triggered, create a GitHub Release and attach APK

**Stage 4: Cleanup** (optional)
- Delete temporary files or caches
- Report build metrics (time, size)

### Error Scenarios

| Scenario | Detection | Recovery |
|----------|-----------|----------|
| Missing env var | Fastlane exits with error | Check GitHub Secrets configuration |
| Gradle build fails | Fastlane logs build error | Fix source code and retry |
| Signature verification fails | Fastlane exits post-build | Check keystore/credentials and retry |
| Artifact upload fails | GitHub Actions step fails | Check permissions and retry |

---

## Testing & Validation Strategy

### Pre-flight Checks (Immediate)

Executed by `validate_apk_setup` lane before any build:
- ✅ Android SDK/NDK installed
- ✅ Gradle available and functional
- ✅ Keystore file exists and is readable
- ✅ Java version 11+ installed
- ✅ `apksigner` available

**Time**: Under 10 seconds

---

### Build Validation (During Build)

Gradle compilation confirms:
- ✅ Source code compiles without errors
- ✅ Dependencies resolve
- ✅ Android resources build successfully
- ✅ APK binary is created

**Time**: 2-4 minutes (depending on project size and caching)

---

### Signing Verification (Post-Build)

`apksigner verify` confirms:
- ✅ APK is properly signed with the release certificate
- ✅ Certificate matches keystore certificate
- ✅ APK integrity is intact

**Time**: Under 5 seconds

---

### Manual Testing (Post-Export)

Developers should test APK installation and basic functionality:
1. **Download APK** from GitHub Actions artifacts or releases
2. **Install on emulator or device**: `adb install -r app-release-*.apk`
3. **Launch app**: Verify it starts without crashes
4. **Test critical flows**: Navigation, sign-in, core features

**Documentation**: Quickstart guide will provide detailed instructions.

---

### Regression Testing

No automated regression testing required for infrastructure feature. However, when integrated into release workflows:
- **Existing app tests** (Vitest, Cypress, etc.) should pass before version bump and APK export
- **APK installation** should be tested on a representative device/Android version
- **App functionality** should be spot-checked post-install

---

## Dependencies & Setup

### Ruby and Fastlane Installation

**Gemfile** (in `app/` directory):
```ruby
source "https://rubygems.org"

gem "fastlane", "~> 2.217"
gem "fastlane-plugin-gradle", "~> 0.10"
gem "fastlane-plugin-signature_info", "~> 0.1"  # For APK signature verification

group :development do
  gem "ruby-debug-ide", "~> 0.7"
end
```

**.ruby-version** (in `app/` directory):
```
3.1.0
```

**Installation**:
```bash
cd app/
ruby --version  # Confirm 3.1.0 or later
bundle install  # Install gems from Gemfile
```

---

### Android SDK/NDK Requirements

**Minimum Versions**:
- Android SDK: API level 30+ (compileSdkVersion 34 recommended)
- Android NDK: r25c or later
- Java: JDK 11, 17, or 21
- Gradle wrapper: 8.0+

**Installation (if not already present)**:
1. **Android Studio**: Download and install from developer.android.com
2. **SDK Manager**: Open Android Studio → Tools → SDK Manager → Install API levels and build tools
3. **NDK**: SDK Manager → SDK Tools → NDK (Side by side) → Install

**Environment Variables**:
```bash
# Add to ~/.bashrc, ~/.zshrc, or equivalent
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_NDK=$ANDROID_HOME/ndk/25.1.8937393  # Adjust version as needed
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0  # Adjust version as needed
```

---

### Gemfile Structure

```ruby
source "https://rubygems.org"

# Core Fastlane
gem "fastlane", "~> 2.217"

# Fastlane plugins (optional but recommended)
gems_to_install = [
  "fastlane-plugin-gradle",           # Gradle task execution
  "fastlane-plugin-signature_info"    # APK signature inspection
]

gems_to_install.each { |gem| gem gem }

# Development tools (optional)
group :development do
  gem "ruby-debug-ide"
end
```

---

### Plugin Dependencies

**Key Plugins Used**:

1. **`gradle` action** (built-in Fastlane): Invokes Gradle tasks
2. **`signature_info` plugin** (optional): Inspects APK signatures in detail
3. **`keychain_access_script`** (built-in Fastlane): Manages local keychain/credentials

**Custom Actions** (defined in `app/fastlane/actions/`):
- `validate_apk_setup.rb` — Pre-flight validation
- `read_app_version.rb` — Read version from `app.json`
- `verify_keystore.rb` — Keystore validation
- `build_release_apk.rb` — Gradle orchestration
- `verify_apk_signature.rb` — Signature verification
- `check_duplicate_apk.rb` — Duplicate APK detection
- `prepare_output_apk.rb` — Artifact finalization

---

## Data Model & Configuration

### Version Management

**Single Source of Truth**: `app/app.json` (`expo` configuration)

**Schema**:
```json
{
  "expo": {
    "version": "1.0.0",      // SemVer string (e.g., "1.0.0", "2.1.0-rc1")
    "android": {
      "versionCode": 42      // Integer build number (incremented per release)
    }
  }
}
```

**Fastlane Reading Logic**:
```ruby
version = app_config["expo"]["version"]
build_number = app_config["expo"]["android"]["versionCode"]
```

**Responsibility**:
- **Developers/CI**: Manage version bumps in `app.json` (e.g., via `npm version patch`)
- **Fastlane**: Read version and build number; incorporate into filename and verification

---

### Build Number Tracking

**Current Approach**: Version code in `app.json` is incremented manually (no auto-increment in Fastlane).

**Rationale**:
- Separation of concerns (version management is separate from build orchestration)
- Explicit control (developers decide when to bump)
- No risk of accidental duplication

**Workflow**:
1. Developer updates `app.json` with new version/build number
2. Developer commits: `git commit -am "chore: bump to v1.0.1 (build 43)"`
3. Developer runs `npm run build:apk` (Fastlane reads version from committed `app.json`)
4. If duplicate version detected, Fastlane warns but proceeds (operator can retry with bumped version)

---

### Keystore Metadata

**Keystore File**: `my-release-key.keystore` (repository root, password-protected)

**Metadata Stored in Keystore**:
- **Key Alias**: Name of the private key entry (e.g., `my-release-key-alias`)
- **Certificate Subject DN**: E.g., `CN=Release Key, O=Company, C=US`
- **Certificate Validity**: Valid from [date] to [date]
- **Signature Algorithm**: E.g., SHA256withRSA

**Fastlane Verification** (using `keytool`):
```bash
keytool -list -v -keystore my-release-key.keystore -alias my-release-key-alias
```

**Output**:
```
Alias name: my-release-key-alias
Creation date: Mar 24, 2025
Entry type: PrivateKeyEntry
...
Certificate:
Owner: CN=Release Key, O=Company, C=US
Issuer: CN=Release Key, O=Company, C=US
Serial number: 1abcdef1234567890
Valid from: Sun Mar 24 00:00:00 UTC 2025 until: Wed Mar 23 23:59:59 UTC 2035
...
```

---

### Output Paths and Naming Conventions

**Gradle Default Output**:
```
app/android/app/build/outputs/apk/release/app-release.apk
```

**Fastlane Renamed Output**:
```
app/android/app/build/outputs/apk/release/app-release-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk
```

**Example**:
```
app-release-v1.0.0-build42-20250324T143022Z.apk
```

**Naming Components**:
- **Prefix**: `app-release-` (fixed)
- **Version**: `v1.0.0` (from `app.json`)
- **Build Number**: `build42` (from `app.json`)
- **Timestamp**: `20250324T143022Z` (ISO 8601 UTC, set at export time)
- **Extension**: `.apk`

**Advantages**:
- ✅ Human-readable version information
- ✅ Sortable by timestamp
- ✅ Uniqueness guaranteed (even if version reused)
- ✅ Matches Gradle naming conventions

---

## Known Constraints & Trade-offs

### 1. No Automatic Retries

**Constraint**: Fastlane exits immediately on any failure; no built-in retry logic.

**Rationale**: Operator has full visibility and control; can decide when/whether to retry and what root cause to address.

**Mitigation**: GitHub Actions workflows can implement external retry logic if desired (e.g., retry step up to 3 times).

---

### 2. Single Keystore Design

**Constraint**: Only `my-release-key.keystore` is supported for production APK signing.

**Rationale**: Simplifies credential management; reduces scope for MVP.

**Future Extension**: After MVP, can add support for multiple keystores (e.g., per environment: staging, production) via Fastlane lane parameters.

---

### 3. GitHub Actions as Primary CI/CD Platform

**Constraint**: MVP targets GitHub Actions only. GitLab CI, Jenkins, and other platforms require adapter workflows.

**Rationale**: Project already uses GitHub Actions; reduces MVP scope.

**Future Extension**: Fastlane lanes are CI-platform-agnostic; other systems can invoke `ci_export_apk` with similar credential injection patterns.

---

### 4. Version Bumping Outside Fastlane Scope

**Constraint**: Fastlane does NOT auto-increment version or build number.

**Rationale**: Separation of concerns; version management is a distinct workflow from build automation.

**Workflow**: Developer/CI must explicitly update `app.json` before exporting (e.g., via `npm version patch && npm run build:apk`).

---

### 5. No App Store Submission

**Constraint**: Fastlane does NOT submit APKs to Google Play Store, Amazon Appstore, or other distribution channels (MVP scope).

**Rationale**: Distribution policies and metadata management are complex; MVP focuses on local/CI export.

**Future Extension**: Can add `upload_to_play_store` lane post-MVP using fastlane-plugin-supply.

---

### 6. No Build Caching or Incremental Builds

**Constraint**: Fastlane invokes `./gradlew clean assembleRelease` (full clean build every time).

**Rationale**: Ensures consistency and avoids cache-related bugs; acceptable for production builds.

**Trade-off**: Longer build time (2-4 minutes) vs. reliability and reproducibility.

**Future Optimization**: Can use `./gradlew assembleRelease` (without clean) for development builds if faster iteration is needed.

---

## Success Criteria & Acceptance

### Phase 1 (Design & Contracts) Completion

✅ **Research.md**: All technology choices documented with rationale (Fastlane versioning, Gradle integration, GitHub Secrets, apksigner verification).

✅ **Data-model.md**: Version management schema, keystore metadata, output naming conventions defined.

✅ **Contracts**:
- `apk-artifact.md` — APK filename format, verification contract
- `fastlane-lanes.md` — Lane signatures, inputs, outputs, error handling
- `ci-integration.md` — GitHub Actions workflow expectations

✅ **Quickstart.md**: Local setup (Ruby, Gemfile, credentials manager), CI setup (GitHub Secrets), invocation examples.

✅ **Constitution Check**: Feature is fully compliant with project principles (infrastructure automation, no deviations from Expo baseline).

### Phase 2 (Implementation) Completion

✅ **Fastfile**: `app/fastlane/Fastfile` with 3 primary lanes and comprehensive documentation.

✅ **Custom Actions**: All 7 custom actions implemented and tested.

✅ **Gemfile**: `app/Gemfile` and `app/.ruby-version` configured; dependencies pinned.

✅ **CI/CD Workflow**: `.github/workflows/build-and-export-apk.yml` implemented; tests passing in GitHub Actions.

✅ **APK Export**: `npm run build:apk` produces signed, verified APK in under 5 minutes.

✅ **Error Messages**: All failure scenarios include remediation steps; non-zero exit codes on errors.

✅ **Documentation**: Inline Fastfile comments, `app/fastlane/README.md`, and this plan provide complete setup and usage guidance.

---

## Next Steps

1. **Phase 0 (Research)**: Investigate Fastlane best practices, credential manager security, Gradle plugin compatibility.
2. **Phase 1 (Design)**: Finalize lane signatures, error messaging, output naming; document contracts.
3. **Phase 2 (Implementation)**: Implement Fastfile, custom actions, GitHub Actions workflow; test locally and in CI.
4. **Phase 3 (Validation)**: Manual testing on emulator/device; verify APK signatures; test CI/CD triggers.
5. **Phase 4 (Integration)**: Merge to main branch; update project documentation; communicate to team.

---
