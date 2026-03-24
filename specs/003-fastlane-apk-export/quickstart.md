# Quickstart: Fastlane APK Export

**Last Updated**: 2025-03-24  
**Version**: 1.0  
**Audience**: Release managers, developers, CI/CD engineers

---

## Quick Overview

This guide helps you build, sign, and export production-ready Android APKs using Fastlane in **5 minutes** (local) or **10 minutes** (CI/CD setup).

### What You'll Accomplish

- ✅ Build a release APK signed with your keystore
- ✅ Verify the signature
- ✅ Download the APK to your device or distribute it
- ✅ Automate builds via GitHub Actions

---

## Part 1: Local Setup (Release Managers)

### 1.1 Prerequisites

Before you start, verify you have:

```bash
# Check Ruby version (3.0+)
ruby --version
# Output: ruby 3.0.0p0 (2020-12-25 revision 95aff21468) [x86_64-darwin20]
# ✅ If Ruby < 3.0, install from https://www.ruby-lang.org

# Check Bundler
bundle --version
# Output: Bundler version 2.x.x
# ✅ If missing: gem install bundler

# Check Android SDK
adb --version
# Output: Android Debug Bridge version X.X.X
# ✅ If missing, install Android SDK via Android Studio

# Check Gradle
cd android && ./gradlew --version
# Output: Gradle X.X.X
# ✅ If missing or error, check android/gradle/wrapper/gradle-wrapper.properties

# Check keystore file
ls -la my-release-key.keystore
# Output: -rw-r--r-- 1 user staff 2768 Mar 24 09:00 my-release-key.keystore
# ✅ File must exist and be readable
```

### 1.2 Validate Setup

Run the validation lane to check everything is ready:

```bash
cd android

# Run validation
bundle exec fastlane android validate_apk_setup
```

**Expected output**:

```
🔍 Validating APK setup...

✅ Android SDK: Found
✅ Gradle: Found (./gradlew)
✅ Keystore: Found (../my-release-key.keystore)
✅ Keystore valid: Yes
✅ Key alias: my-release-key-alias
✅ app.json: Found
✅ Version: 1.0.0 (valid)
✅ Build number: 42 (valid)
✅ Ruby: 3.0.0
✅ Bundler: installed

✅ All checks passed!
```

**If any check fails**, see Troubleshooting section (§5) below.

### 1.3 Build Your First APK

#### Step 1: Navigate to Android Directory

```bash
cd android
```

#### Step 2: Install Gems (first time only)

```bash
bundle install
```

**Output**:

```
Using fastlane 2.217.0
Bundle complete! X gems in Y seconds
```

#### Step 3: Build the APK

```bash
bundle exec fastlane android build_and_export_apk
```

**First run**: You'll be prompted for credentials (only first time):

```
🔨 Building APK...
  Version: 1.0.0
  Build Number: 42

🔑 Fastlane Credentials Manager
  Enter keystore password: [enter password, hidden]
  Enter key password: [enter password, hidden]

(Credentials saved to ~/.fastlane/credentials)
```

**Build output** (2-5 minutes):

```
📦 Running Gradle assembleRelease...
  [compile logs...]
  
✅ APK built successfully!

APK Location: ./app/build/outputs/apk/release/app-v1.0.0-build42-20250324T093015Z.apk
File Size: 42.3 MB
Signature: ✓ Verified (RSA-2048, SHA256)

Done!
```

#### Step 4: Verify APK Location

```bash
ls -lh app/build/outputs/apk/release/app-v1.0.0-build42-*.apk
```

**Output**:

```
-rw-r--r-- 1 user staff 42M Mar 24 09:30 app/build/outputs/apk/release/app-v1.0.0-build42-20250324T093015Z.apk
```

### 1.4 Install APK on Device/Emulator

#### Option A: Using ADB (Android Debug Bridge)

```bash
# Find running device/emulator
adb devices
# Output:
#   List of attached devices
#   emulator-5554          device
#   192.168.1.100:5555     device

# Install APK
APK=app/build/outputs/apk/release/app-v1.0.0-build42-*.apk
adb install "$APK"
```

**Output**:

```
Installing app-v1.0.0-build42-20250324T093015Z.apk...
Success
```

#### Option B: Using Android Studio

1. Connect device or start emulator
2. Open Android Studio → Device Manager
3. Drag APK file onto device window
4. Installation completes

### 1.5 Verify App Works

1. Open the installed app on your device
2. Check version in app settings (should show v1.0.0)
3. Verify basic functionality (navigation, API calls, etc.)

---

## Part 2: NPM Script Wrapper (Convenience)

### 2.1 Add NPM Script

Edit `package.json`:

```json
{
  "scripts": {
    "build:apk": "cd android && bundle exec fastlane android build_and_export_apk",
    "build:apk:clean": "cd android && bundle exec fastlane android build_and_export_apk clean_build:true",
    "validate:apk": "cd android && bundle exec fastlane android validate_apk_setup"
  }
}
```

### 2.2 Use NPM Script

From repository root:

```bash
# Build APK
npm run build:apk

# Build APK with clean (fresh) build
npm run build:apk:clean

# Validate setup
npm run validate:apk
```

---

## Part 3: CI/CD Setup (GitHub Actions)

### 3.1 Add GitHub Secrets

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Create three secrets:

   | Name | Value | Where to Find |
   |------|-------|---------------|
   | `KEYSTORE_PASSWORD` | Your keystore password | From keystore setup |
   | `KEY_ALIAS` | `my-release-key-alias` | Default; from keystore |
   | `KEY_PASSWORD` | Your key password | From keystore setup |

**Step-by-step**:

1. Click "New repository secret"
2. Name: `KEYSTORE_PASSWORD`
3. Value: `your-actual-password`
4. Click "Add secret"
5. Repeat for `KEY_ALIAS` and `KEY_PASSWORD`

### 3.2 Create Workflow File

Create `.github/workflows/build-and-export-apk.yml`:

```yaml
name: Build APK

on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
          cache: 'gradle'
      
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.0'
          bundler-cache: true
          working-directory: './android'
      
      - name: Build APK
        working-directory: ./android
        env:
          KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: bundle exec fastlane android ci_export_apk
      
      - name: Upload APK
        uses: actions/upload-artifact@v3
        if: success()
        with:
          name: apk
          path: android/app/build/outputs/apk/release/
          retention-days: 7
      
      - name: Create Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v1
        with:
          token: ${{ github.token }}
          files: android/app/build/outputs/apk/release/*.apk
          draft: false
          prerelease: ${{ contains(github.ref, '-beta') || contains(github.ref, '-rc') }}
```

### 3.3 Trigger Workflow

#### Option A: Tag Push

```bash
# Create version tag
git tag v1.0.0
git push origin v1.0.0

# Monitor workflow
# Go to: GitHub → Actions → Build APK → [Latest run]
```

#### Option B: Manual Trigger

1. Go to GitHub → Actions → Build APK
2. Click "Run workflow"
3. Workflow starts immediately

**Workflow duration**: ~3-5 minutes

### 3.4 Download APK from CI

After workflow completes:

1. Go to GitHub → Actions → [Workflow Run]
2. Scroll down to Artifacts
3. Click `apk` → Download (zip file)
4. Extract zip to get APK

---

## Part 4: Daily Workflow

### 4.1 Building for Testing

```bash
# 1. Ensure you're on main branch with latest changes
git checkout main
git pull origin main

# 2. Bump version in app/app.json (optional)
# Edit app/app.json: increment version or versionCode

# 3. Commit changes
git add app/app.json
git commit -m "chore: bump version to 1.0.1"
git push origin main

# 4. Build APK
npm run build:apk

# 5. Find your APK
ls android/app/build/outputs/apk/release/app-v*.apk

# 6. Install on device
adb install android/app/build/outputs/apk/release/app-v*.apk
```

### 4.2 Building for Release

```bash
# 1. Ensure version is bumped in app/app.json

# 2. Create release tag
git tag v1.0.1
git push origin v1.0.1

# 3. GitHub Actions automatically builds and creates release

# 4. Verify release
# Go to GitHub → Releases → v1.0.1 → Download APK from assets
```

### 4.3 Version Bumping Strategy

**Before building, update app/app.json**:

```json
{
  "expo": {
    "version": "1.0.1",    // ← Increment version
    "android": {
      "versionCode": 43    // ← Increment build number
    }
  }
}
```

**Semver guidelines**:

| Version Type | When to Use | Example |
|-------------|-----------|---------|
| **PATCH** (1.0.X) | Bug fixes, minor tweaks | v1.0.1 → v1.0.2 |
| **MINOR** (1.X.0) | New features, backward compatible | v1.0.0 → v1.1.0 |
| **MAJOR** (X.0.0) | Breaking changes | v1.0.0 → v2.0.0 |
| **PRERELEASE** | Beta/RC testing | v1.1.0-beta.1 |

---

## Part 5: Troubleshooting

### Error: "Android SDK not found"

**Cause**: Android SDK not installed or not in PATH

**Fix**:

```bash
# Check if SDK is installed
ls ~/Library/Android/sdk

# If not, install via Android Studio
# Open Android Studio → SDK Manager → Install SDK

# Add to PATH (~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Error: "Gradle not found"

**Cause**: Gradle wrapper not found or not executable

**Fix**:

```bash
# Check gradle wrapper
ls -la android/gradlew

# Make executable
chmod +x android/gradlew

# Test
cd android && ./gradlew --version
```

### Error: "Keystore not found"

**Cause**: `my-release-key.keystore` missing or in wrong location

**Fix**:

```bash
# Check location
ls -la my-release-key.keystore

# If missing, upload from backup:
# 1. Get keystore file from team vault/backup
# 2. Place in repository root: ./my-release-key.keystore
# 3. Add to .gitignore (don't commit!)

# Verify permissions
chmod 644 my-release-key.keystore
```

### Error: "Invalid keystore password"

**Cause**: Wrong password entered or credentials corrupted

**Fix**:

```bash
# Clear cached credentials
rm -rf ~/.fastlane/credentials

# Rebuild and re-enter password
bundle exec fastlane android build_and_export_apk

# If still fails, verify password with keytool
keytool -list -keystore ./my-release-key.keystore
# (Enter correct password at prompt)
```

### Error: "Gradle build failed"

**Cause**: Source code compilation errors

**Fix**:

```bash
# Check Gradle logs
cd android
./gradlew clean assembleRelease --stacktrace

# Fix errors in source code based on stack trace
# Then retry fastlane build
```

### Error: "APK size too small" (< 30 MB)

**Cause**: Incomplete build or missing assets

**Fix**:

```bash
# Check if APK was actually generated
ls -la android/app/build/outputs/apk/release/

# If not, rebuild
npm run build:apk:clean

# If APK is still small, check Gradle errors
```

### Error: "Signature verification failed"

**Cause**: Keystore corrupt, wrong password, or APK corrupted during transfer

**Fix**:

```bash
# Verify keystore integrity
keytool -list -v -keystore ./my-release-key.keystore
# (Enter correct password)

# Rebuild APK
npm run build:apk

# Manually verify signature
apksigner verify -v android/app/build/outputs/apk/release/app-v*.apk
```

### Error: "GitHub Secrets not set"

**Cause**: `KEYSTORE_PASSWORD`, `KEY_ALIAS`, or `KEY_PASSWORD` not configured

**Fix**:

1. Go to GitHub → Settings → Secrets and variables → Actions
2. Verify all three secrets exist:
   - `KEYSTORE_PASSWORD`
   - `KEY_ALIAS`
   - `KEY_PASSWORD`
3. If missing, create them (see Part 3.1)

---

## Part 6: Advanced Usage

### 6.1 Custom Output Directory

```bash
# Build APK to custom directory
cd android
bundle exec fastlane android build_and_export_apk \
  output_directory:'/tmp/apks/'

ls /tmp/apks/app-v*.apk
```

### 6.2 Override Version (Testing)

```bash
# Build APK with custom version (for testing)
cd android
bundle exec fastlane android build_and_export_apk \
  version:'1.0.0-test.1' \
  build_number:999

# Output: app-v1.0.0-test.1-build999-TIMESTAMP.apk
```

### 6.3 Skip Signature Verification (Unsafe!)

```bash
# Build without verifying signature (NOT RECOMMENDED)
cd android
bundle exec fastlane android build_and_export_apk \
  skip_verification:true
```

### 6.4 Verbose Logging

```bash
# Enable verbose output for debugging
cd android
bundle exec fastlane android build_and_export_apk \
  verbose:true
```

---

## Part 7: File Locations & Cleanup

### 7.1 APK Output Location

```bash
# Latest APK
ls -lt android/app/build/outputs/apk/release/ | head -5

# Size of APKs
du -sh android/app/build/outputs/apk/release/

# Cleanup old APKs
rm android/app/build/outputs/apk/release/app-v*.apk
```

### 7.2 Gradle Cache

```bash
# Clear Gradle cache (if builds are slow)
cd android
./gradlew clean

# Full cleanup
rm -rf .gradle build android/app/build
```

### 7.3 Fastlane Cache

```bash
# Clear Fastlane cache (if issues persist)
rm -rf ~/.fastlane

# Verify Fastlane is working
bundle exec fastlane --version
```

---

## Part 8: Checklist for Release

Before distributing your APK, verify:

- [ ] Version bumped in `app/app.json` (version + versionCode)
- [ ] Committed changes: `git add app/app.json && git commit -m "..."`
- [ ] Tag created: `git tag v1.0.0 && git push origin v1.0.0`
- [ ] GitHub Actions workflow completed successfully
- [ ] APK downloaded and tested on device
- [ ] App launches successfully
- [ ] Version matches: `adb shell dumpsys package com.fullstackdemo.app | grep versionName`
- [ ] Signature verified: `apksigner verify -v app.apk`
- [ ] File size reasonable: > 30 MB, < 100 MB

---

## Part 9: References

| Link | Purpose |
|------|---------|
| [fastlane Documentation](https://docs.fastlane.tools/) | Official Fastlane docs |
| [Android Signing Docs](https://developer.android.com/studio/publish/app-signing) | Android signing guide |
| [APKSigner Tool](https://developer.android.com/studio/command-line/apksigner) | Signature verification |
| [Gradle Android Plugin](https://developer.android.com/build) | Gradle for Android |
| [Data Model](data-model.md) | Version, build number, keystore schema |
| [Lane Contracts](contracts/fastlane-lanes.md) | Lane signatures and error codes |
| [CI/CD Integration](contracts/ci-integration.md) | GitHub Actions setup |
| [APK Contract](contracts/apk-artifact.md) | APK specification and validation |

---

## Quick Commands

```bash
# Setup
cd android && bundle install

# Validate setup
bundle exec fastlane android validate_apk_setup

# Build APK (local)
bundle exec fastlane android build_and_export_apk

# Build APK (NPM script)
npm run build:apk

# Test APK on device
adb install android/app/build/outputs/apk/release/app-v*.apk

# Create release tag (triggers GitHub Actions)
git tag v1.0.0 && git push origin v1.0.0

# Clear caches (if issues)
cd android && ./gradlew clean && rm -rf ~/.fastlane
```

---

**Quick Support**:

- 🔧 Setup issues? See Part 5: Troubleshooting
- 📦 Building APK? See Part 1.3: Build Your First APK
- 🚀 CI/CD? See Part 3: CI/CD Setup
- 🎯 Release process? See Part 7: Daily Workflow

---

**Version**: 1.0  
**Status**: COMPLETE  
**Last Updated**: 2025-03-24
