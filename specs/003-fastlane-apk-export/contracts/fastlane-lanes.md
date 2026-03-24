# Contract: Fastlane Lanes Specification

**Type**: Lane Interface Contract  
**Version**: 1.0  
**Last Updated**: 2025-03-24

---

## Overview

This document defines the interface contracts for Fastlane lanes responsible for APK building, signing, verification, and validation. Each lane has a precise signature (inputs, outputs, exit codes, error handling) that must be honored by the implementation.

---

## 1. Lane: `build_and_export_apk`

### 1.1 Purpose

Primary lane for **local development** release managers. Builds, signs, and exports a production-ready APK with interactive credential prompts and full validation.

### 1.2 Signature

```ruby
lane :build_and_export_apk do |options|
  # Inputs (options)
  # Outputs (lane context)
  # Side Effects (file system, credentials manager)
end
```

### 1.3 Input Parameters

| Parameter | Type | Default | Required | Purpose |
|-----------|------|---------|----------|---------|
| `version` | String | nil (read from app.json) | No | Override version (testing only) |
| `build_number` | Integer | nil (read from app.json) | No | Override build number (testing only) |
| `output_directory` | String | `./android/app/build/outputs/apk/release/` | No | Custom output path |
| `keystore_path` | String | `./my-release-key.keystore` | No | Keystore file location |
| `clean_build` | Boolean | `true` | No | Run `gradlew clean` before build |
| `skip_verification` | Boolean | `false` | No | Skip APK signature verification |
| `verbose` | Boolean | `false` | No | Enable verbose logging |

### 1.4 Lane Context Output

After successful completion, the lane sets the following values in `Actions.lane_context`:

| Key | Type | Value | Purpose |
|-----|------|-------|---------|
| `SharedValues::APK_PATH` | String | `/path/to/app-v1.0.0-build42-20250324T093015Z.apk` | Location of final APK |
| `SharedValues::VERSION` | String | `1.0.0` | App version from app.json |
| `SharedValues::BUILD_NUMBER` | Integer | `42` | Build number from app.json |
| `SharedValues::FILE_SIZE` | Integer | `44236800` (bytes) | APK file size |
| `SharedValues::TIMESTAMP` | String | `20250324T093015Z` | Build timestamp (ISO 8601) |

**Usage in Other Lanes**:

```ruby
lane :deploy_apk do
  build_and_export_apk()
  
  apk_path = Actions.lane_context[SharedValues::APK_PATH]
  version = Actions.lane_context[SharedValues::VERSION]
  
  # Deploy APK using retrieved values
  upload_to_github_releases(apk_path: apk_path, version: version)
end
```

### 1.5 Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ build_and_export_apk lane (local)                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ validate_apk_setup              │
        │ - Check Android SDK installed   │
        │ - Check Gradle available        │
        │ - Check keystore exists         │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ read_app_version                │
        │ - Parse app/app.json            │
        │ - Extract version, build_number │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ Prompt for credentials          │
        │ (Fastlane credentials manager)  │
        │ - Keystore password             │
        │ - Key alias                     │
        │ - Key password                  │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ [Optional] gradle clean         │
        │ if clean_build == true          │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ build_release_apk               │
        │ - Run: ./gradlew assembleRelease│
        │ - With signing config           │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ rename_apk_with_timestamp       │
        │ - Version-stamped filename      │
        │ - ISO 8601 timestamp            │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ [Unless skip_verification]      │
        │ verify_apk_signature            │
        │ - apksigner verify              │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ Report success                  │
        │ - Print APK path and size       │
        │ - Set lane context values       │
        └─────────────────────────────────┘
```

### 1.6 Success Exit Behavior

**Exit Code**: `0` (success)

**Console Output**:

```
🔨 Building APK...
  Version: 1.0.0
  Build Number: 42
  Keystore: ./my-release-key.keystore

🔑 Reading credentials from Fastlane credentials manager...
  (Enter keystore password if first run)

📦 Gradle assembleRelease...
  [Time: ~2-3 minutes]
  
✅ APK built successfully!
  APK: ./android/app/build/outputs/apk/release/app-v1.0.0-build42-20250324T093015Z.apk
  Size: 42.3 MB
  Signature: ✓ Verified
```

### 1.7 Error Handling & Exit Codes

| Scenario | Exit Code | Error Message | Recovery |
|----------|-----------|---------------|----------|
| Android SDK not found | 1 | "Android SDK not found. Install via Android Studio or `sdkmanager`." | Install SDK |
| Gradle not found | 1 | "Gradle not found. Verify `android/gradlew` exists." | Check Gradle setup |
| Keystore not found | 1 | "Keystore not found at ./my-release-key.keystore" | Upload keystore |
| Invalid keystore password | 1 | "Keystore password incorrect or invalid." | Re-enter password |
| Gradle build failed | 1 | "Gradle build failed. See logs above." | Fix source code |
| APK not generated | 1 | "APK not generated. Check Gradle output above." | Investigate Gradle logs |
| Signature verification failed | 1 | "APK signature verification failed. Keystore or signing config may be incorrect." | Verify keystore |
| Output directory not writable | 1 | "Cannot write to output directory: {PATH}" | Check permissions |

### 1.8 Example Invocations

**Basic usage (all defaults)**:

```bash
cd android
bundle exec fastlane android build_and_export_apk
```

**Custom output directory**:

```bash
bundle exec fastlane android build_and_export_apk \
  output_directory:'/tmp/apks/'
```

**Skip verification (unsafe, not recommended)**:

```bash
bundle exec fastlane android build_and_export_apk \
  skip_verification:true
```

**From NPM script**:

```bash
npm run build:apk
# (defined in package.json, calls fastlane lane)
```

---

## 2. Lane: `ci_export_apk`

### 2.1 Purpose

Lane for **CI/CD environments** (GitHub Actions). Non-interactive, reads all credentials from environment variables. Builds, signs, and exports APK for automated release pipelines.

### 2.2 Signature

```ruby
lane :ci_export_apk do |options|
  # Inputs (environment variables)
  # Outputs (lane context + file)
  # No interactive prompts
end
```

### 2.3 Environment Variable Inputs

| Variable | Type | Required | Purpose | Example |
|----------|------|----------|---------|---------|
| `KEYSTORE_PASSWORD` | String | Yes | Keystore master password | `my-secure-pass` |
| `KEY_ALIAS` | String | Yes | Key alias in keystore | `my-release-key-alias` |
| `KEY_PASSWORD` | String | Yes | Key password (may differ from keystore) | `key-pass-123` |
| `OUTPUT_DIRECTORY` | String | No | Custom output path | `/tmp/apks/` |
| `GRADLE_BUILD_DIR` | String | No | Gradle project directory | `./android/` |

### 2.4 Lane Context Output

Same as `build_and_export_apk`:

| Key | Type | Value |
|-----|------|-------|
| `SharedValues::APK_PATH` | String | `/path/to/app-v1.0.0-build42-20250324T093015Z.apk` |
| `SharedValues::VERSION` | String | `1.0.0` |
| `SharedValues::BUILD_NUMBER` | Integer | `42` |
| `SharedValues::FILE_SIZE` | Integer | `44236800` |
| `SharedValues::TIMESTAMP` | String | `20250324T093015Z` |

### 2.5 Execution Flow

```
┌─────────────────────────────────────────────────────────┐
│ ci_export_apk lane (CI/CD)                              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ validate_apk_setup              │
        │ - Check Android SDK installed   │
        │ - Check Gradle available        │
        │ - Check keystore exists         │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ read_app_version                │
        │ - Parse app/app.json            │
        │ - Extract version, build_number │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ Verify environment variables    │
        │ - KEYSTORE_PASSWORD required    │
        │ - KEY_ALIAS required            │
        │ - KEY_PASSWORD required         │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ [Always] gradle clean           │
        │ - Fresh build in CI              │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ build_release_apk               │
        │ - Run: ./gradlew assembleRelease│
        │ - With env var signing config   │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ rename_apk_with_timestamp       │
        │ - Version-stamped filename      │
        │ - ISO 8601 timestamp            │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ verify_apk_signature            │
        │ - apksigner verify (required)   │
        └─────────────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────┐
        │ Report success with JSON        │
        │ - Print structured output       │
        │ - Set lane context values       │
        └─────────────────────────────────┘
```

### 2.6 Success Exit Behavior

**Exit Code**: `0` (success)

**Console Output (JSON for CI parsing)**:

```json
{
  "status": "success",
  "apk_path": "./android/app/build/outputs/apk/release/app-v1.0.0-build42-20250324T093015Z.apk",
  "version": "1.0.0",
  "build_number": 42,
  "file_size_bytes": 44236800,
  "file_size_mb": 42.3,
  "timestamp": "20250324T093015Z",
  "signature_verified": true,
  "build_duration_seconds": 145
}
```

### 2.7 Error Handling & Exit Codes

| Scenario | Exit Code | Error | Recovery |
|----------|-----------|-------|----------|
| Missing KEYSTORE_PASSWORD | 1 | "Missing required env var: KEYSTORE_PASSWORD" | Set secret in GitHub Actions |
| Missing KEY_ALIAS | 1 | "Missing required env var: KEY_ALIAS" | Set secret in GitHub Actions |
| Missing KEY_PASSWORD | 1 | "Missing required env var: KEY_PASSWORD" | Set secret in GitHub Actions |
| Invalid credentials | 1 | "Keystore password incorrect or key alias not found" | Verify secrets are correct |
| Android SDK not found | 1 | "Android SDK not found" | Ensure CI runner has SDK |
| Gradle build failed | 1 | "Gradle build failed with exit code {CODE}" | Check build logs |
| Signature verification failed | 1 | "APK signature verification failed" | Verify keystore and signing config |
| Network failure (unlikely) | 1 | "Error: {details}" | Retry workflow |

### 2.8 GitHub Actions Integration Example

```yaml
# .github/workflows/build-and-export-apk.yml
name: Build APK

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
      
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: './android'
      
      - name: Build APK
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          bundle exec fastlane android ci_export_apk
      
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: apk
          path: android/app/build/outputs/apk/release/
          retention-days: 7
```

---

## 3. Lane: `validate_apk_setup`

### 3.1 Purpose

Validation lane that checks all prerequisites for APK building without actually building. Used before first build or to diagnose issues.

### 3.2 Signature

```ruby
lane :validate_apk_setup do |options|
  # Inputs: none
  # Outputs: validation report
  # Exit Code: 0 (all valid) or 1 (issues found)
end
```

### 3.3 Validation Checklist

The lane performs the following checks:

| Check | Command | Success Criteria | Error Message |
|-------|---------|------------------|---------------|
| **Android SDK** | `which adb` | Command found | "Android SDK not found" |
| **Gradle** | `ls android/gradlew` | File exists and executable | "Gradle not found" |
| **Keystore** | `ls ./my-release-key.keystore` | File exists | "Keystore not found" |
| **Keystore valid** | `keytool -list -keystore` | Exit code 0 with password | "Keystore invalid" |
| **Key alias exists** | `keytool -list -v -keystore` | Alias found | "Key alias not found" |
| **app.json exists** | `ls app/app.json` | File exists and readable | "app.json not found" |
| **Version format** | Regex match | Matches semver | "Version format invalid" |
| **Build number** | Integer check | > 0 | "Build number must be >= 1" |
| **Ruby installed** | `ruby --version` | Version >= 3.0 | "Ruby 3.0+ not found" |
| **Bundler installed** | `bundle --version` | Present | "Bundler not installed" |

### 3.4 Success Exit Behavior

**Exit Code**: `0` (all checks passed)

**Console Output**:

```
🔍 Validating APK setup...

✅ Android SDK: Found (adb v1.0.41)
✅ Gradle: Found (./android/gradlew)
✅ Keystore: Found (./my-release-key.keystore)
✅ Keystore valid: Yes
✅ Key alias exists: my-release-key-alias
✅ app.json: Found
✅ Version format: 1.0.0 (valid)
✅ Build number: 42 (valid)
✅ Ruby: 3.0.0 (valid)
✅ Bundler: installed

✅ All validation checks passed! Ready to build APK.
```

### 3.5 Failure Exit Behavior

**Exit Code**: `1` (one or more checks failed)

**Console Output**:

```
🔍 Validating APK setup...

✅ Android SDK: Found
❌ Gradle: NOT FOUND
   Run: ./android/gradlew to verify
✅ Keystore: Found
✅ app.json: Found
⚠️  Version format: 1.0 (should be X.Y.Z)

❌ Validation failed. Fix the issues above and try again.
```

### 3.6 Example Invocations

```bash
# Validate before first build
bundle exec fastlane android validate_apk_setup

# From script
./scripts/validate-apk-setup.sh
```

---

## 4. Custom Actions

### 4.1 `read_app_version` Action

**Purpose**: Parse app.json and extract version info

**Signature**:

```ruby
def run(params)
  # Returns: { version: "1.0.0", build_number: 42, package: "com.app" }
end
```

**Output**:

```ruby
Actions.lane_context[SharedValues::VERSION] = "1.0.0"
Actions.lane_context[SharedValues::BUILD_NUMBER] = 42
```

### 4.2 `verify_keystore` Action

**Purpose**: Check keystore exists and is valid

**Signature**:

```ruby
def run(params)
  # params[:keystore_path]
  # params[:keystore_password]
  # params[:key_alias]
  # Raises exception if invalid
end
```

### 4.3 `build_release_apk` Action

**Purpose**: Run Gradle build with signing config

**Signature**:

```ruby
def run(params)
  # params[:gradle_dir]
  # params[:clean]
  # params[:keystore_password]
  # params[:key_alias]
  # params[:key_password]
  # Returns: path to generated APK
end
```

### 4.4 `verify_apk_signature` Action

**Purpose**: Use apksigner to verify APK signature

**Signature**:

```ruby
def run(params)
  # params[:apk_path]
  # Raises exception if verification fails
end
```

---

## 5. Lane Dependencies & Execution Order

### 5.1 Dependency Graph

```
build_and_export_apk
  ├─→ validate_apk_setup
  ├─→ read_app_version
  ├─→ prompt_for_credentials
  ├─→ build_release_apk
  ├─→ rename_apk_with_timestamp
  └─→ verify_apk_signature

ci_export_apk
  ├─→ validate_apk_setup
  ├─→ read_app_version
  ├─→ verify_env_variables
  ├─→ build_release_apk
  ├─→ rename_apk_with_timestamp
  └─→ verify_apk_signature

validate_apk_setup (standalone)
  ├─→ check_android_sdk
  ├─→ check_gradle
  ├─→ check_keystore
  ├─→ check_app_json
  └─→ check_ruby_and_bundler
```

### 5.2 Parallel Execution Notes

- **No actions can run in parallel** (sequential only)
- All actions depend on previous step succeeding
- Fail-fast strategy: Stop on first error

---

## 6. Exit Code Reference

| Code | Meaning | Recovery |
|------|---------|----------|
| `0` | Success | N/A (all good) |
| `1` | Generic error | Check error message and logs |
| `2` | User interrupted | Retry lane |
| `3` | Configuration error | Fix config and retry |
| `4` | Build error | Fix source code and retry |
| `5` | Signing error | Verify keystore and credentials |

---

## 7. Summary

| Lane | Audience | Interaction | Exit on Error |
|------|----------|-------------|---------------|
| `build_and_export_apk` | Release managers (local) | Interactive prompts | Yes, exit code 1 |
| `ci_export_apk` | CI/CD systems | Env vars only | Yes, exit code 1 |
| `validate_apk_setup` | Developers (diagnostic) | No interaction | Yes, exit code 1 |

---

**Version**: 1.0  
**Status**: COMPLETE  
**Last Updated**: 2025-03-24
