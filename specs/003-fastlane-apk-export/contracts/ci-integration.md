# Contract: GitHub Actions CI/CD Integration

**Type**: CI/CD Integration Contract  
**Version**: 1.0  
**Last Updated**: 2025-03-24

---

## Overview

This document specifies the GitHub Actions workflow contract for automated APK building and release. It defines workflow triggers, environment variables, artifact handling, and error reporting for the fastlane APK export pipeline in CI/CD environments.

---

## 1. Workflow Specification

### 1.1 Workflow File

**Location**: `.github/workflows/build-and-export-apk.yml`

**Purpose**: Build and export signed APK on tag push or manual trigger, with artifact upload to GitHub Actions and optional release creation.

### 1.2 Workflow Triggers

#### 1.2.1 Tag Push Trigger

```yaml
on:
  push:
    tags:
      - 'v*'                # Any tag starting with 'v' (e.g., v1.0.0, v1.0.1-beta)
      - 'build-*'           # Manual build tags (e.g., build-123)
```

**Behavior**:
- Triggers on any push of a semantic version tag (`v1.0.0`, `v1.1.0-beta.1`, etc.)
- Branch: automatic (HEAD of tag)
- Payload: `github.event.ref` contains tag name

#### 1.2.2 Manual Dispatch Trigger

```yaml
on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'Git tag to build (e.g., v1.0.0)'
        required: true
        type: string
```

**Behavior**:
- User can manually trigger workflow from Actions tab
- Workflow checks out specified tag
- If tag doesn't exist, checkout fails

### 1.3 Workflow Jobs

#### 1.3.1 Job: `build-apk`

**Runs On**: `ubuntu-latest` (must have Android SDK pre-installed or use action)

**Purpose**: Single job that handles the entire APK build and release pipeline

```yaml
jobs:
  build-apk:
    runs-on: ubuntu-latest
    
    steps:
      # ... (see 1.4 below)
```

---

## 2. Workflow Steps

### 2.1 Step 1: Checkout Repository

```yaml
- name: Checkout repository
  uses: actions/checkout@v4
  with:
    fetch-depth: 0
    token: ${{ github.token }}
```

**Purpose**: Clone repository at the triggered tag

**Inputs**:
- `ref`: Auto-set by workflow (tag name from trigger)
- `fetch-depth: 0`: Full history (needed for version detection)

**Success**: Repository checked out, .git directory available

**Failure**: Checkout fails if tag doesn't exist

### 2.2 Step 2: Setup Java

```yaml
- name: Setup Java
  uses: actions/setup-java@v4
  with:
    distribution: 'temurin'
    java-version: '17'
    cache: 'gradle'
```

**Purpose**: Install Java runtime and cache Gradle dependencies

**Inputs**:
- `java-version: '17'`: Matches Gradle 8.10.2 requirements
- `cache: 'gradle'`: Cache Gradle wrapper and dependencies

**Success**: `java --version` shows Java 17

**Failure**: Java installation fails (rare on ubuntu-latest)

### 2.3 Step 3: Setup Ruby

```yaml
- name: Setup Ruby
  uses: ruby/setup-ruby@v1
  with:
    ruby-version: '3.0'
    bundler-cache: true
    working-directory: './android'
```

**Purpose**: Install Ruby 3.0+ and cache Bundler gems

**Inputs**:
- `ruby-version: '3.0'`: Matches Fastlane requirement
- `bundler-cache: true`: Auto-cache Gemfile.lock
- `working-directory`: Install gems in android/ directory

**Success**: `ruby --version` shows Ruby 3.0+, `bundle --version` works

**Failure**: Ruby installation fails (rare)

### 2.4 Step 4: Build APK

```yaml
- name: Build APK
  working-directory: ./android
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
  run: |
    bundle exec fastlane android ci_export_apk
```

**Purpose**: Execute fastlane CI lane with GitHub Secrets

**Inputs (Secrets)**:
- `KEYSTORE_PASSWORD`: Keystore master password (must be set in GitHub Secrets)
- `KEY_ALIAS`: Key alias in keystore (default: `my-release-key-alias`)
- `KEY_PASSWORD`: Key password (may differ from keystore password)

**Success**: 
- Exit code: 0
- Console output: APK path and file size
- File created: `android/app/build/outputs/apk/release/app-v*.apk`

**Failure**:
- Exit code: 1
- Error message in logs (missing secrets, keystore issues, build errors)

### 2.5 Step 5: Upload APK Artifact

```yaml
- name: Upload APK Artifact
  uses: actions/upload-artifact@v3
  if: success()
  with:
    name: apk
    path: android/app/build/outputs/apk/release/
    retention-days: 7
    if-no-files-found: error
```

**Purpose**: Store APK as GitHub Actions artifact for download

**Inputs**:
- `if: success()`: Only upload if build succeeded
- `name: apk`: Artifact name (visible in Actions tab)
- `retention-days: 7`: Auto-delete after 7 days
- `if-no-files-found: error`: Fail step if no APKs found

**Success**: Artifact uploaded, downloadable from Actions tab

**Failure**: No APK generated or upload permission denied

### 2.6 Step 6: Create GitHub Release (Optional)

```yaml
- name: Create GitHub Release
  if: startsWith(github.ref, 'refs/tags/v')
  uses: softprops/action-gh-release@v1
  with:
    token: ${{ github.token }}
    files: android/app/build/outputs/apk/release/*.apk
    draft: false
    prerelease: ${{ contains(github.ref, '-beta') || contains(github.ref, '-rc') }}
    body: |
      ## APK Build Report
      
      **Version**: ${{ github.ref_name }}
      **Commit**: ${{ github.sha }}
      **Build Time**: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
      
      ### APK Details
      - File: `app-v*.apk`
      - Location: `android/app/build/outputs/apk/release/`
      - Signature: Signed with release keystore
```

**Purpose**: Create GitHub release with APK attached (optional, advanced feature)

**Inputs**:
- `if: startsWith(github.ref, 'refs/tags/v')`: Only for version tags
- `prerelease`: Auto-detect pre-releases (`-beta`, `-rc`)
- `files`: Glob pattern to APK files

**Success**: GitHub release created, APK visible in release assets

**Failure**: Permission denied (token insufficient) or no files match glob

---

## 3. Environment Variables

### 3.1 GitHub Secrets (Required)

These must be configured in GitHub repository settings before workflow runs.

**Location**: Repository → Settings → Secrets and variables → Actions

| Secret Name | Type | Required | Example | How to Set |
|------------|------|----------|---------|-----------|
| `KEYSTORE_PASSWORD` | String | YES | `my-secure-password` | GitHub UI → New repository secret |
| `KEY_ALIAS` | String | YES | `my-release-key-alias` | GitHub UI → New repository secret |
| `KEY_PASSWORD` | String | YES | `key-password-123` | GitHub UI → New repository secret |

**Setup Instructions**:

1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Enter name (e.g., `KEYSTORE_PASSWORD`) and value
4. Click "Add secret"
5. Repeat for all three secrets

### 3.2 GitHub Context Variables (Automatic)

These are automatically provided by GitHub Actions:

| Variable | Type | Example | Purpose |
|----------|------|---------|---------|
| `github.ref` | String | `refs/tags/v1.0.0` | Git reference (branch or tag) |
| `github.ref_name` | String | `v1.0.0` | Tag or branch name only |
| `github.sha` | String | `abc123def456...` | Commit SHA (short) |
| `github.repository` | String | `user/repo` | Repository full name |
| `github.run_id` | Integer | `12345678` | Workflow run ID |
| `github.token` | String | `ghs_abcdef...` | Temporary GitHub token (for auth) |
| `github.server_url` | String | `https://github.com` | GitHub instance URL |

### 3.3 Environment Variable Examples

**In Workflow YAML**:

```yaml
- name: Build APK
  env:
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
    GITHUB_TOKEN: ${{ github.token }}
  run: bundle exec fastlane android ci_export_apk
```

**Fastlane Access**:

```ruby
lane :ci_export_apk do
  # Fastlane automatically reads from ENV
  keystore_password = ENV['KEYSTORE_PASSWORD']
  key_alias = ENV['KEY_ALIAS']
  key_password = ENV['KEY_PASSWORD']
end
```

---

## 4. Artifact Specification

### 4.1 Output Artifact

**Type**: Android Package (APK)

**Location**: `android/app/build/outputs/apk/release/app-v*.apk`

**Filename Pattern**: `app-v{VERSION}-build{BUILD_NUMBER}-{TIMESTAMP}.apk`

**Examples**:
- `app-v1.0.0-build1-20250324T093015Z.apk`
- `app-v1.1.0-beta.1-build5-20250325T143022Z.apk`

### 4.2 Artifact Storage

**GitHub Actions Artifact**:

```yaml
- name: Upload APK Artifact
  uses: actions/upload-artifact@v3
  with:
    name: apk
    path: android/app/build/outputs/apk/release/
    retention-days: 7
```

**Access**:
- Path: Actions → [Workflow Run] → Artifacts → `apk`
- Lifetime: 7 days (auto-delete)
- Download: Zip file containing all APKs

**GitHub Release Asset** (optional):

```yaml
- name: Create Release
  uses: softprops/action-gh-release@v1
  with:
    files: android/app/build/outputs/apk/release/*.apk
```

**Access**:
- Path: Releases → [Tag] → Assets
- Lifetime: Permanent (same as release)
- Download: Direct APK download

---

## 5. Error Handling & Status Reporting

### 5.1 Failure Scenarios

| Step | Failure Mode | Root Cause | Recovery |
|------|--------------|-----------|----------|
| **Checkout** | Tag not found | Workflow triggered with non-existent tag | Push correct tag or retry |
| **Setup Java** | Installation fails | Rare; java-version incompatible | Use ubuntu-latest action |
| **Setup Ruby** | Installation fails | Rare; ruby-version not available | Use default Ruby version |
| **Build APK** | Missing secrets | Secrets not configured in GitHub | Set secrets in Settings → Secrets |
| **Build APK** | Build fails | Source code errors or Gradle issues | Fix source code and retry |
| **Build APK** | Keystore invalid | Incorrect password or missing file | Verify keystore credentials |
| **Upload Artifact** | No APK found | Build failed silently | Check build logs for errors |
| **Create Release** | Permission denied | Token insufficient | Use `${{ github.token }}` |

### 5.2 Status Checks

**GitHub Workflow Status Page**:

```
Workflow: Build APK
Branch: (tag)
Status: ✅ Success / ❌ Failure / ⚠️  Warning

Steps:
  ✅ Checkout repository
  ✅ Setup Java
  ✅ Setup Ruby
  ✅ Build APK (2m 34s)
  ✅ Upload APK Artifact
  ✅ Create GitHub Release (optional)
```

**Failure Status Example**:

```
❌ Workflow Failed

Steps:
  ✅ Checkout repository
  ✅ Setup Java
  ✅ Setup Ruby
  ❌ Build APK (exit code 1)
     Error: Missing KEYSTORE_PASSWORD secret
  
  Skipped:
    ⊘ Upload APK Artifact
    ⊘ Create GitHub Release
```

### 5.3 Notification (Optional)

GitHub automatically notifies:
- Workflow author via email (success/failure)
- Repository contributors (if configured)
- Slack (if integrated)

---

## 6. Workflow Configuration Examples

### 6.1 Minimal Configuration

```yaml
name: Build APK

on:
  push:
    tags: ['v*']

jobs:
  build-apk:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
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
        if: always()
        with:
          name: apk
          path: android/app/build/outputs/apk/release/
```

### 6.2 Full Configuration (with Release)

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
      
      - name: Upload APK Artifact
        uses: actions/upload-artifact@v3
        if: success()
        with:
          name: apk
          path: android/app/build/outputs/apk/release/
          retention-days: 7
      
      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/v')
        uses: softprops/action-gh-release@v1
        with:
          token: ${{ github.token }}
          files: android/app/build/outputs/apk/release/*.apk
          draft: false
          prerelease: ${{ contains(github.ref, '-beta') || contains(github.ref, '-rc') }}
          body: |
            ## APK Build Report
            
            **Version**: ${{ github.ref_name }}
            **Commit**: ${{ github.sha }}
            **Workflow**: [View Run](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})
```

---

## 7. Monitoring & Logs

### 7.1 Accessing Logs

**GitHub Actions UI**:

1. Go to repository → Actions
2. Click workflow run (tagged commit)
3. Click job (`build-apk`)
4. View logs for each step

**Logs Output**:

```
Run bundle exec fastlane android ci_export_apk
  
🔨 Building APK...
  Version: 1.0.0
  Build Number: 42
  Keystore: ./my-release-key.keystore

📦 Gradle assembleRelease...
  [compile logs...]
  
✅ APK built: app-v1.0.0-build42-20250324T093015Z.apk (42.3 MB)
✅ Signature verified
```

### 7.2 Exporting Logs

**From GitHub UI**:
- Click "..." → Download logs (zip file)

**From GitHub CLI**:

```bash
gh run view <run-id> --log
```

---

## 8. Security Considerations

### 8.1 Secret Management

**Best Practices**:

- ✅ Use GitHub Secrets (encrypted, audited access)
- ❌ Do NOT hardcode passwords in workflow YAML
- ❌ Do NOT log secrets (fastlane auto-hides with `***`)
- ✅ Rotate keystore password periodically
- ✅ Restrict secret access to trusted team members

### 8.2 Token Security

**GitHub Token**:

- `${{ github.token }}` is temporary (expires after workflow)
- Auto-revoked after job completes
- Sufficient for artifact upload and release creation
- Only valid within GitHub Actions runner

### 8.3 Artifact Security

**Retention**:

- Default: 90 days
- Set to 7 days in upload step (recommended)
- Auto-delete after expiration

**Access Control**:

- Only repository members can download artifacts
- Public repositories: publicly downloadable artifacts
- Private repositories: restricted to collaborators

---

## 9. Testing Workflow

### 9.1 Dry Run (Manual Dispatch)

```bash
# Manually trigger workflow via GitHub UI
# Actions → Build APK → "Run workflow" → select tag → "Run workflow"
```

**Verify**:
- ✅ Workflow started successfully
- ✅ All steps completed
- ✅ APK uploaded to artifacts
- ✅ Release created (if configured)

### 9.2 Tag Push Test

```bash
# Push test tag
git tag v1.0.0-test
git push origin v1.0.0-test

# Monitor workflow
gh run list --workflow build-and-export-apk.yml --limit 1
gh run view <run-id> --log
```

---

## 10. Summary

| Item | Specification |
|------|---------------|
| **Triggers** | Tag push (v*) or manual dispatch |
| **Runs On** | ubuntu-latest |
| **Build Duration** | ~3-5 minutes (Java + Ruby setup + Gradle build) |
| **Secrets Required** | KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD |
| **Artifact Output** | APK in GitHub Actions artifacts (7 days) |
| **Release Output** | Optional GitHub release with APK attachment |
| **Exit Code** | 0 (success) or 1 (failure) |

---

**Version**: 1.0  
**Status**: COMPLETE  
**Last Updated**: 2025-03-24
