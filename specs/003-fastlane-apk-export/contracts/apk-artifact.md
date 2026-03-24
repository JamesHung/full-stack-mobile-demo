# Contract: APK Artifact Specification

**Type**: Output Artifact Contract  
**Version**: 1.0  
**Last Updated**: 2025-03-24

---

## Overview

This contract defines the APK (Android Package) artifact produced by the Fastlane `build_and_export_apk` and `ci_export_apk` lanes. It specifies the artifact format, naming convention, validation requirements, and metadata embedded within the APK.

---

## 1. Artifact Metadata

### 1.1 Artifact Identity

| Property | Value | Source |
|----------|-------|--------|
| **Artifact Type** | Android Package (APK) | Android build system |
| **File Extension** | `.apk` | Android standard |
| **MIME Type** | `application/vnd.android.package-archive` | Android IANA registration |
| **Build Variant** | `release` | Gradle buildTypes.release |
| **Signature** | RSA-2048 with SHA256 | Keystore signing |

### 1.2 Artifact Provenance

```
Source: Android Gradle Build System
├── Gradle Version: 8.10.2 (from gradle-wrapper.properties)
├── SDK Target: Android 35 (API 35)
├── Compile SDK: 35 (from build.gradle)
├── Min SDK: 24 (API 24)
├── Signing Key: my-release-key-alias (from my-release-key.keystore)
└── Built By: Fastlane (build_and_export_apk or ci_export_apk lane)
```

---

## 2. Filename Contract

### 2.1 Filename Format

**Pattern**:

```
app-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk
```

**Regex Validation**:

```regex
^app-v(\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?)-build(\d+)-(\d{8}T\d{6}Z)\.apk$
```

### 2.2 Component Definitions

| Component | Regex | Example | Rules |
|-----------|-------|---------|-------|
| Prefix | `^app-` | `app-` | Literal; identifies main app APK |
| Version | `v\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?` | `v1.0.0` or `v1.1.0-beta.1` | SemVer + optional prerelease suffix |
| Build Sep | `-build` | `-build` | Literal separator |
| Build Number | `\d+` | `42` | Positive integer; matches `expo.android.versionCode` |
| Timestamp Sep | `-` | `-` | Literal separator |
| Timestamp | `\d{8}T\d{6}Z` | `20250324T093015Z` | ISO 8601 UTC (`YYYYMMDDTHHMMSSZ`) |
| Extension | `\.apk` | `.apk` | Literal; Android Package file type |

### 2.3 Examples

| Scenario | Filename | Validation |
|----------|----------|-----------|
| Production v1.0.0 | `app-v1.0.0-build1-20250324T093015Z.apk` | ✅ Valid |
| Patch release v1.0.1 | `app-v1.0.1-build2-20250324T095430Z.apk` | ✅ Valid |
| Feature release v1.1.0 | `app-v1.1.0-build5-20250325T143022Z.apk` | ✅ Valid |
| Pre-release beta | `app-v1.1.0-beta.1-build8-20250325T120000Z.apk` | ✅ Valid |
| Pre-release RC | `app-v2.0.0-rc.2-build15-20250326T080000Z.apk` | ✅ Valid |
| **Invalid: No version** | `app-build42-20250324T093015Z.apk` | ❌ Missing `v{VERSION}` |
| **Invalid: Bad timestamp** | `app-v1.0.0-build1-2025-03-24.apk` | ❌ Wrong timestamp format |
| **Invalid: Missing build num** | `app-v1.0.0-20250324T093015Z.apk` | ❌ Missing `-build{N}` |

---

## 3. Output Location Contract

### 3.1 Default Output Directory

**Path**: `./android/app/build/outputs/apk/release/`

**Structure**:

```
android/app/build/outputs/apk/release/
├── app-v1.0.0-build1-20250324T093015Z.apk (42.3 MB)
├── app-v1.0.1-build2-20250324T095430Z.apk (42.5 MB)
└── app-v1.1.0-build5-20250325T143022Z.apk (43.0 MB)
```

### 3.2 Custom Output Directory

**Contract**: Output directory is configurable via lane parameter.

```ruby
build_and_export_apk(output_directory: '/custom/path/')
```

**Behavior**:
- Lane creates directory if it doesn't exist
- Lane copies signed APK to specified directory
- Lane reports final location in success message

### 3.3 File Permissions

After build completion:

| Attribute | Value |
|-----------|-------|
| Owner | Current user |
| Permission (Linux) | `644` (rw-r--r--) |
| Permission (macOS) | `644` (rw-r--r--) |
| Read Access | Release manager, CI system |
| Write Access | Fastlane process only |

---

## 4. APK Content Contract

### 4.1 Internal Metadata

The APK contains the following metadata readable via `aapt dump badging`:

```
application-label: 'Full-Stack Demo'
application-label-locale: 'en-US'
application-icon-120: 'res/mipmap-ldpi-v4/ic_launcher.png'
package: com.fullstackdemo.app
versionCode: <BUILD_NUMBER>
versionName: <VERSION>
targetSdkVersion: 35
minSdkVersion: 24
uses-permission: name='android.permission.*'
...
```

### 4.2 Version Metadata Inside APK

| Field | Source | Purpose |
|-------|--------|---------|
| `versionCode` (AndroidManifest.xml) | `expo.android.versionCode` | Android system version tracking |
| `versionName` (AndroidManifest.xml) | `expo.version` | User-visible version string |
| `package` (AndroidManifest.xml) | `expo.android.package` | Unique app identifier |

**Verification Command**:

```bash
aapt dump badging app-v1.0.0-build42-20250324T093015Z.apk | grep -E "^(application-label|package|versionCode|versionName)"
```

**Expected Output**:

```
application-label: 'Full-Stack Demo'
package: 'com.fullstackdemo.app'
versionCode: 42
versionName: '1.0.0'
```

---

## 5. Signature Contract

### 5.1 Signature Requirements

Every APK produced by Fastlane must be:

1. **Signed** with `my-release-key-alias` from `./my-release-key.keystore`
2. **Verified** with `apksigner verify` before release
3. **Single-signed** (only one signing key per APK, no multiple signatures)

### 5.2 Signature Validation Command

```bash
apksigner verify --verbose app-v1.0.0-build42-20250324T093015Z.apk
```

**Expected Output**:

```
Verifies
Signed by:
  CN=Release Key, OU=Android, O=Company, C=US
  Certificate fingerprint: <SHA256_HASH>
  ...
```

### 5.3 Signature Metadata

| Property | Expected | Validation |
|----------|----------|-----------|
| **Algorithm** | RSA-2048 | `apksigner verify` confirms |
| **Hash Algorithm** | SHA256 | Modern Android requirement |
| **Key Subject** | `CN=Release Key, ...` | Matches keystore entry |
| **Certificate Validity** | Valid (not expired) | `apksigner verify` checks dates |
| **Signature Validity** | No tampering detected | `apksigner verify` confirms integrity |

### 5.4 Signature Verification in Lane

```ruby
def verify_apk_signature(apk_path)
  cmd = "apksigner verify --verbose #{apk_path}"
  unless system(cmd)
    raise "❌ Signature verification failed: #{apk_path}"
  end
  UI.success("✅ APK signature verified: #{apk_path}")
end
```

---

## 6. Size & Performance Contract

### 6.1 Expected APK Size

| Build Type | Expected Size | Min | Max | Reason |
|-----------|---------------|-----|-----|--------|
| Release (optimized) | ~40-50 MB | 30 MB | 100 MB | Code + assets + React Native bundle |
| Debug (unoptimized) | ~80-120 MB | 60 MB | 150 MB | Includes debugging symbols |

**Actual Measurement** (from Phase 0 testing):
- Debug APK: ~163 MB (with metadata, not optimized)
- Release APK: ~42-43 MB (expected range)

### 6.2 Size Validation

If APK size is outside expected range:

```ruby
def validate_apk_size(apk_path, min_mb: 30, max_mb: 100)
  size_mb = File.size(apk_path) / (1024.0 * 1024.0)
  
  if size_mb < min_mb
    UI.error("❌ APK size too small: #{size_mb.round(2)} MB (expected >= #{min_mb} MB)")
    raise "APK build may be incomplete"
  elsif size_mb > max_mb
    UI.warning("⚠️  APK size unusually large: #{size_mb.round(2)} MB (expected <= #{max_mb} MB)")
    UI.warning("Consider checking for bloated dependencies or unoptimized assets")
  else
    UI.success("✅ APK size acceptable: #{size_mb.round(2)} MB")
  end
end
```

---

## 7. Verification Checklist

### 7.1 Pre-Release Verification

Before distributing an APK, verify:

- [ ] Filename matches pattern: `app-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk`
- [ ] Filename version matches `app.json` → `expo.version`
- [ ] Filename build number matches `app.json` → `expo.android.versionCode`
- [ ] APK file exists at expected location
- [ ] APK file size > 30 MB and < 100 MB (realistic range)
- [ ] APK signature verified: `apksigner verify --verbose app.apk` exits with code 0
- [ ] APK metadata (versionCode, versionName) matches expectations: `aapt dump badging app.apk`
- [ ] APK is installable on test device (adb install)
- [ ] App launches and basic functionality works

### 7.2 Verification Script

```bash
#!/bin/bash
APK=$1

echo "🔍 Verifying APK: $APK"

# Check file exists
[[ -f "$APK" ]] || { echo "❌ APK not found"; exit 1; }

# Check filename format
if [[ ! "$APK" =~ ^app-v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?-build[0-9]+-[0-9]{8}T[0-9]{6}Z\.apk$ ]]; then
  echo "❌ Filename format invalid: $APK"
  exit 1
fi

# Check file size
SIZE_MB=$(( $(stat -f%z "$APK") / 1024 / 1024 ))
[[ $SIZE_MB -gt 30 ]] || { echo "❌ APK too small: ${SIZE_MB} MB"; exit 1; }
[[ $SIZE_MB -lt 100 ]] || { echo "⚠️  APK unusually large: ${SIZE_MB} MB"; }

# Verify signature
apksigner verify --verbose "$APK" || { echo "❌ Signature verification failed"; exit 1; }

# Verify metadata
echo "✅ APK verification passed"
aapt dump badging "$APK" | head -5
```

---

## 8. Error Conditions

### 8.1 APK Not Generated

**Condition**: Build step completed but no APK file exists.

**Cause**:
- Gradle assembly failed silently
- Signing config incorrect
- Output directory misconfigured

**Recovery**:
1. Check `android/app/build/` directory for any .apk files
2. Run `./gradlew clean assembleRelease --stacktrace` manually to see errors
3. Verify Gradle signing configuration

### 8.2 Signature Verification Failed

**Condition**: `apksigner verify` returns non-zero exit code.

**Cause**:
- Keystore password incorrect
- Key alias not found in keystore
- APK file corrupted during transfer
- Wrong signing configuration in Gradle

**Recovery**:
1. Verify keystore exists: `keytool -list -keystore ./my-release-key.keystore`
2. Verify credentials with keystore: `keytool -list -v -keystore ./my-release-key.keystore`
3. Rebuild APK: `./gradlew clean assembleRelease --stacktrace`

### 8.3 APK Size Anomaly

**Condition**: APK size is outside expected range (< 30 MB or > 100 MB).

**Cause**:
- Incomplete build (< 30 MB)
- Bloated dependencies (> 100 MB)
- Debug symbols included (> 80 MB)

**Recovery**:
- Small APK: Verify source code compiles; check for build errors in Gradle logs
- Large APK: Analyze APK with `bundletool` or `lint` to identify bloated dependencies

---

## 9. Manifest & Compatibility

### 9.1 AndroidManifest.xml Contract

The APK must contain a valid `AndroidManifest.xml` with:

```xml
<manifest
    xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.fullstackdemo.app"
    android:versionCode="<BUILD_NUMBER>"
    android:versionName="<VERSION>">
    
    <uses-sdk
        android:minSdkVersion="24"
        android:targetSdkVersion="35"
        android:compileSdkVersion="35" />
    
    <application android:label="@string/app_name" />
</manifest>
```

### 9.2 Compatibility Matrix

| Device | Min SDK | Target SDK | Compatibility |
|--------|---------|-----------|---------------|
| Android 7.0 (API 24) | ✅ Supported | ✅ Supported | ✅ Compatible |
| Android 8.0 (API 26) | ✅ Supported | ✅ Supported | ✅ Compatible |
| Android 12.0 (API 31) | ✅ Supported | ✅ Supported | ✅ Compatible |
| Android 14.0 (API 34) | ✅ Supported | ✅ Supported | ✅ Compatible |
| Android 15.0 (API 35) | ✅ Supported | ✅ Supported | ✅ Compatible |

---

## 10. Distribution Expectations

### 10.1 File Format Guarantee

Once the APK is produced by Fastlane:

- **File will NOT be modified** by the lane after signature verification
- **File will NOT be compressed** beyond APK's internal structure
- **File will NOT be renamed** after timestamp is set
- **File can be copied, moved, or uploaded** to any location without re-signing

### 10.2 File Integrity

After APK is copied to output directory:

```bash
# Original file hash
md5sum app-v1.0.0-build42-20250324T093015Z.apk
# => abc123def456...

# After copying to another location
cp app-v1.0.0-build42-20250324T093015Z.apk /tmp/
md5sum /tmp/app-v1.0.0-build42-20250324T093015Z.apk
# => abc123def456... (same hash; file integrity preserved)
```

---

## 11. Summary

| Property | Specification |
|----------|---------------|
| **File Type** | Android Package (.apk) |
| **Naming Format** | `app-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk` |
| **Signature** | RSA-2048 with SHA256 (verified with apksigner) |
| **Default Location** | `./android/app/build/outputs/apk/release/` |
| **Expected Size** | 30-100 MB (typically 40-50 MB) |
| **Verification** | `apksigner verify --verbose` must exit with code 0 |
| **Metadata** | versionCode and versionName match app.json |
| **Compatibility** | Android 7.0 (API 24) through Android 15.0 (API 35) |

---

**Version**: 1.0  
**Status**: COMPLETE  
**Last Updated**: 2025-03-24
