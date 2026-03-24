# Data Model: Fastlane APK Export

**Specification**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

---

## Overview

This document defines the configuration entities, version management schema, and naming conventions used by the Fastlane APK export workflow. The data model ensures consistent version tracking, build numbering, keystore metadata management, and standardized APK artifact naming.

---

## 1. Version Management Schema

### 1.1 Expo Configuration (app/app.json)

The authoritative source for app versioning is the Expo configuration file `app/app.json`. Fastlane reads version information from this file for all APK builds.

**File Location**: `app/app.json`

**Relevant Structure**:

```json
{
  "expo": {
    "name": "Full-Stack Demo",
    "slug": "full-stack-demo",
    "version": "1.0.0",
    "platforms": ["ios", "android"],
    "android": {
      "versionCode": 1,
      "package": "com.fullstackdemo.app"
    }
  }
}
```

### 1.2 Version Components

| Field | Type | Source | Purpose | Constraints |
|-------|------|--------|---------|------------|
| `version` | semver | `expo.version` | Semantic version (MAJOR.MINOR.PATCH) | Must match regex: `^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$` |
| `versionCode` | integer | `expo.android.versionCode` | Android build number (monotonically increasing) | Must be >= 1; no auto-increment in Fastlane |
| `package` | string | `expo.android.package` | Android package identifier | Must be valid Java package format |

### 1.3 Version Reading Logic

**Fastlane Action**: `read_app_version.rb` (custom action)

**Pseudocode**:

```ruby
def run(params)
  # Read app.json
  app_json_path = File.join(Dir.pwd, 'app', 'app.json')
  app_config = JSON.parse(File.read(app_json_path))
  
  # Extract version and build number
  version = app_config.dig('expo', 'version')
  version_code = app_config.dig('expo', 'android', 'versionCode')
  package = app_config.dig('expo', 'android', 'package')
  
  # Validate
  raise "Version not found in app.json" unless version
  raise "Version format invalid" unless version.match?(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/)
  raise "versionCode not found or invalid" unless version_code.is_a?(Integer) && version_code > 0
  
  # Return
  Actions.lane_context[SharedValues::VERSION] = version
  Actions.lane_context[SharedValues::BUILD_NUMBER] = version_code
end
```

### 1.4 Version Examples

| Scenario | Version | versionCode | APK Filename | Notes |
|----------|---------|-------------|--------------|-------|
| Initial release | `1.0.0` | `1` | `app-v1.0.0-build1-20250324T093015Z.apk` | First production release |
| Bug fix | `1.0.1` | `2` | `app-v1.0.1-build2-20250324T095430Z.apk` | Patch release |
| Feature release | `1.1.0` | `5` | `app-v1.1.0-build5-20250325T143022Z.apk` | Minor version bump |
| Major release | `2.0.0` | `10` | `app-v2.0.0-build10-20250326T082145Z.apk` | Breaking changes |
| Pre-release | `1.1.0-beta.1` | `8` | `app-v1.1.0-beta.1-build8-20250325T120000Z.apk` | Beta/RC releases |

---

## 2. Build Number Tracking

### 2.1 Build Number Policy

**Decision**: No auto-increment in Fastlane; build number is manually managed in `app/app.json`.

**Rationale**:
- Separates version management from build automation
- Prevents race conditions in CI (multiple parallel builds)
- Allows developers explicit control over build numbering
- Aligns with semantic versioning workflows

### 2.2 Build Number Constraints

| Constraint | Value | Reason |
|-----------|-------|--------|
| Minimum | `1` | Android versionCode must be >= 1 |
| Monotonic | Increasing | Android requires each APK version to have a higher versionCode |
| Type | Integer | Android expects numeric build codes only |
| Maximum | `2,147,483,647` | Java Integer max value (32-bit signed) |

### 2.3 Duplicate Build Detection

If a build with the same version and versionCode already exists:

**Behavior**:
1. Fastlane warns: "APK with this version (v{VERSION}-build{BUILD_NUMBER}) already exists at {PATH}"
2. Fastlane continues build (does not block)
3. Fastlane overwrites existing APK
4. Exit code: 0 (success with warning)

**Example Output**:

```
⚠️  WARNING: APK v1.0.0-build1-20250324T093015Z already exists. Overwriting...
✅ Build completed successfully: app-v1.0.0-build1-20250324T093015Z.apk (42.3 MB)
```

---

## 3. Keystore Metadata Structure

### 3.1 Keystore File

**Location**: `./my-release-key.keystore` (repository root)

**Properties**:
- **File Size**: ~2.7 KB
- **Format**: JKS (Java KeyStore)
- **Encryption**: Password-protected
- **Permissions**: User-readable, not world-writable

### 3.2 Key Information

| Property | Value | Source |
|----------|-------|--------|
| Key Alias | `my-release-key-alias` | From setup; used in Gradle signing config |
| Algorithm | RSA (2048-bit) | From keytool analysis |
| Signature Algorithm | SHA256withRSA | Standard for modern Android apps |
| Validity | Valid from creation; long-term (5-10 years typical) | From keytool -v output |
| Subject DN | `CN=Release Key, OU=Android, O=Company, C=US` | From certificate metadata |

### 3.3 Keystore Credentials Schema

Credentials are stored in **two locations**:

#### 3.3.1 Local Development (Fastlane Credentials Manager)

**Storage**: `~/.fastlane/credentials` (encrypted)

**Schema**:

```yaml
Fastlane Credentials Manager Store:
  KEYSTORE_PASSWORD: <encrypted_password>
  KEY_ALIAS: "my-release-key-alias"
  KEY_PASSWORD: <encrypted_password>
```

**Setup Command**:

```bash
fastlane credentials_manager store_api_key \
  --key KEYSTORE_PASSWORD \
  --value <password> \
  --encrypt
```

#### 3.3.2 CI/CD (GitHub Secrets)

**Storage**: GitHub Secrets (encrypted at rest)

**Schema**:

```
GitHub Repository Secrets:
  KEYSTORE_PASSWORD: <password>
  KEY_ALIAS: "my-release-key-alias"
  KEY_PASSWORD: <password>
```

**Usage in Workflow**:

```yaml
- name: Build APK
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
  run: bundle exec fastlane android ci_export_apk
```

### 3.4 Credential Access Pattern

| Environment | Access Pattern | Fallback |
|-------------|----------------|----------|
| Local (build_and_export_apk) | Fastlane credentials manager (prompt first time) | Environment variables if available |
| CI (ci_export_apk) | Environment variables only (GitHub Secrets) | Fail if not provided |

---

## 4. APK Artifact Naming Convention

### 4.1 Filename Format

**Pattern**:

```
app-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk
```

**Components**:

| Component | Format | Example | Notes |
|-----------|--------|---------|-------|
| Prefix | Literal `app-` | `app-` | Identifies artifact as main app APK |
| Version | `v\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?` | `v1.0.0` or `v1.1.0-beta.1` | Semver with optional pre-release |
| Build Number | `build\d+` | `build42` | Must match versionCode from app.json |
| Timestamp | ISO 8601 (UTC) | `20250324T093015Z` | `YYYYMMDDTHHMMSSZ` format |
| Extension | Literal `.apk` | `.apk` | Android Package file |

### 4.2 Filename Validation Regex

```regex
^app-v(\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?)-build(\d+)-(\d{8}T\d{6}Z)\.apk$
```

**Regex Groups**:
- Group 1: Version (e.g., `1.0.0-beta.1`)
- Group 2: Build number (e.g., `42`)
- Group 3: Timestamp (e.g., `20250324T093015Z`)

### 4.3 Filename Examples

| Scenario | Filename | APK Size | Built At |
|----------|----------|----------|----------|
| v1.0.0 release | `app-v1.0.0-build1-20250324T093015Z.apk` | 42.3 MB | 2025-03-24 09:30:15 UTC |
| v1.0.1 patch | `app-v1.0.1-build2-20250324T095430Z.apk` | 42.5 MB | 2025-03-24 09:54:30 UTC |
| v1.1.0-beta.1 | `app-v1.1.0-beta.1-build5-20250325T143022Z.apk` | 43.0 MB | 2025-03-25 14:30:22 UTC |
| Timestamp collision | `app-v1.0.0-build1-20250324T093015Z.apk` (retry) | 42.3 MB | Same timestamp (low probability) |

### 4.4 Timestamp Generation

**Implementation**:

```ruby
# Ruby Time in UTC, ISO 8601 format
timestamp = Time.now.utc.strftime('%Y%m%dT%H%M%SZ')
# => "20250324T093015Z"

filename = "app-v#{version}-build#{build_number}-#{timestamp}.apk"
```

---

## 5. Output Paths & Configuration

### 5.1 Directory Structure

**Default Build Output**:

```
android/
├── app/
│   └── build/
│       └── outputs/
│           └── apk/
│               └── release/
│                   ├── app-v1.0.0-build1-20250324T093015Z.apk
│                   ├── app-v1.0.1-build2-20250324T095430Z.apk
│                   └── app-v1.1.0-build5-20250325T143022Z.apk
├── fastlane/
│   ├── Fastfile
│   ├── actions/
│   │   ├── read_app_version.rb
│   │   ├── verify_keystore.rb
│   │   ├── build_release_apk.rb
│   │   └── verify_apk_signature.rb
│   └── report/
├── Gemfile
├── Gemfile.lock
└── .ruby-version
```

### 5.2 Configuration Variables

**Fastfile Variables** (set in platform block or lane):

```ruby
# Default paths (customizable)
KEYSTORE_PATH = './my-release-key.keystore'
OUTPUT_DIRECTORY = './android/app/build/outputs/apk/release/'
GRADLE_BUILD_DIR = './android/'

# Credentials (sourced from Fastlane credentials manager or env vars)
KEYSTORE_PASSWORD = ENV['KEYSTORE_PASSWORD'] || prompt(text: "Keystore password: ", secure_text: true)
KEY_ALIAS = ENV['KEY_ALIAS'] || 'my-release-key-alias'
KEY_PASSWORD = ENV['KEY_PASSWORD'] || prompt(text: "Key password: ", secure_text: true)

# Build settings
MIN_SDK_VERSION = 24
TARGET_SDK_VERSION = 35
COMPILE_SDK_VERSION = 35
```

### 5.3 Gradle Configuration Integration

**File**: `android/app/build.gradle`

**Signing Config** (added by Fastlane or pre-configured):

```gradle
signingConfigs {
    release {
        storeFile file('./my-release-key.keystore')
        storePassword System.getenv('KEYSTORE_PASSWORD') ?: ''
        keyAlias System.getenv('KEY_ALIAS') ?: 'my-release-key-alias'
        keyPassword System.getenv('KEY_PASSWORD') ?: ''
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

## 6. Configuration Entities

### 6.1 Fastlane Lane Parameters

**Lane Signature**: `build_and_export_apk(options = {})`

| Parameter | Type | Default | Required | Purpose |
|-----------|------|---------|----------|---------|
| `version` | string | Read from app.json | No | Override version (for testing) |
| `build_number` | integer | Read from app.json | No | Override versionCode (for testing) |
| `output_directory` | string | `./android/app/build/outputs/apk/release/` | No | Custom APK output path |
| `keystore_path` | string | `./my-release-key.keystore` | No | Custom keystore location |
| `clean_build` | boolean | `true` | No | Run `gradlew clean` before build |
| `skip_verification` | boolean | `false` | No | Skip APK signature verification (unsafe) |
| `verbose` | boolean | `false` | No | Enable verbose logging |

**Example Invocation**:

```ruby
# Use defaults
build_and_export_apk()

# Custom output directory
build_and_export_apk(output_directory: '/tmp/apks/')

# Skip verification (not recommended)
build_and_export_apk(skip_verification: true)
```

### 6.2 Gradle Build Parameters

**Properties Passed to Gradle**:

```bash
./gradlew clean assembleRelease \
  -Pandroid.injected.signing.store.file=./my-release-key.keystore \
  -Pandroid.injected.signing.store.password=$KEYSTORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=$KEY_ALIAS \
  -Pandroid.injected.signing.key.password=$KEY_PASSWORD
```

### 6.3 APKSigner Verification Parameters

**Command**: `apksigner verify --verbose app.apk`

**Validates**:
- APK signature validity
- Certificate validity dates
- Signature algorithm compatibility
- No tampering detected

---

## 7. Error States & Recovery

### 7.1 Version Reading Failures

| Error | Cause | Recovery |
|-------|-------|----------|
| `app.json not found` | Missing `app/app.json` | Check Expo config location |
| `Version not found` | Missing `expo.version` field | Add `version: "1.0.0"` to app.json |
| `Invalid version format` | Version doesn't match semver | Use format: `X.Y.Z[-prerelease]` |
| `versionCode missing` | Missing `expo.android.versionCode` | Add `versionCode: 1` to expo.android |
| `versionCode <= 0` | Invalid build number | Build number must be >= 1 |

### 7.2 Keystore Failures

| Error | Cause | Recovery |
|-------|-------|----------|
| `Keystore not found` | Missing `./my-release-key.keystore` | Check keystore path; upload if in CI |
| `Invalid keystore password` | Wrong password provided | Use correct keystore password |
| `Key alias not found` | Alias doesn't match keystore contents | Verify alias with `keytool -list -keystore` |
| `Signature verification failed` | APK not properly signed | Check Gradle signing config |

### 7.3 Build Failures

| Error | Cause | Recovery |
|-------|-------|----------|
| `Gradle build failed` | Compilation errors in source code | Fix source code; check Gradle logs |
| `SDK not found` | Android SDK not installed | Install required SDK version |
| `No APK generated` | Gradle assembly failed silently | Check `build/outputs/apk/release/` |
| `Insufficient disk space` | Build directory too large | Clean build artifacts: `./gradlew clean` |

---

## 8. Validation Rules

### 8.1 Pre-Build Validation Checklist

```ruby
def validate_setup
  errors = []
  
  # Check app.json exists and is readable
  app_json = File.join(Dir.pwd, 'app', 'app.json')
  errors << "app.json not found" unless File.exist?(app_json)
  
  # Check version format
  version = read_app_version()
  unless version.match?(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/)
    errors << "Version format invalid: #{version}"
  end
  
  # Check versionCode is positive integer
  build_number = read_app_build_number()
  errors << "versionCode must be >= 1" unless build_number.is_a?(Integer) && build_number > 0
  
  # Check keystore exists
  keystore_path = ENV['KEYSTORE_PATH'] || './my-release-key.keystore'
  errors << "Keystore not found: #{keystore_path}" unless File.exist?(keystore_path)
  
  # Check Android SDK
  errors << "Android SDK not found" unless `which aapt`.strip.length > 0
  
  # Check Gradle
  errors << "Gradle not found" unless File.exist?(File.join(Dir.pwd, 'android', 'gradlew'))
  
  raise errors.join("\n") unless errors.empty?
end
```

### 8.2 Post-Build Validation Checklist

```ruby
def validate_output(apk_path)
  errors = []
  
  # Check APK exists
  errors << "APK not generated: #{apk_path}" unless File.exist?(apk_path)
  
  # Check APK filename format
  filename = File.basename(apk_path)
  unless filename.match?(/^app-v\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?-build\d+-\d{8}T\d{6}Z\.apk$/)
    errors << "APK filename format invalid: #{filename}"
  end
  
  # Check APK size (should be > 10 MB for typical app)
  size_mb = File.size(apk_path) / (1024.0 * 1024.0)
  if size_mb < 10
    UI.warning("APK size unusually small: #{size_mb.round(2)} MB (expected > 10 MB)")
  end
  
  # Verify APK signature
  unless system("apksigner verify --verbose #{apk_path}")
    errors << "APK signature verification failed"
  end
  
  raise errors.join("\n") unless errors.empty?
end
```

---

## 9. Summary Table

| Aspect | Definition | Example |
|--------|-----------|---------|
| **Version Source** | `app/app.json` (expo.version) | `1.0.0` |
| **Build Number Source** | `app/app.json` (expo.android.versionCode) | `42` |
| **Keystore Location** | Repository root | `./my-release-key.keystore` |
| **Key Alias** | From keystore metadata | `my-release-key-alias` |
| **Credentials (Local)** | Fastlane credentials manager | `~/.fastlane/credentials` |
| **Credentials (CI)** | GitHub Secrets | `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` |
| **Output Directory** | Gradle standard path | `./android/app/build/outputs/apk/release/` |
| **Filename Format** | `app-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk` | `app-v1.0.0-build42-20250324T093015Z.apk` |
| **Timestamp Format** | ISO 8601 UTC | `20250324T093015Z` |

---

## References

- **Specification**: [spec.md](spec.md) § Keystore Password Management Strategy
- **Plan**: [plan.md](plan.md) § Architecture & Tech Stack
- **Research**: [research.md](research.md) § Gradle Build System, Fastlane Architecture
- **Gradle Documentation**: https://docs.gradle.org/current/userguide/
- **Android Signing**: https://developer.android.com/studio/publish/app-signing
- **Fastlane Documentation**: https://docs.fastlane.tools/

---

**Version**: 1.0  
**Last Updated**: 2025-03-24  
**Status**: COMPLETE
