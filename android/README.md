# Android APK Build — Fastlane

使用 Fastlane 在本地或 CI/CD 環境中建置並簽署 Android APK。

## 前置需求

| 工具 | 版本 | 說明 |
|------|------|------|
| Ruby | 2.7+ | fastlane 執行環境（CI 使用 3.1） |
| Bundler | 最新 | Ruby 套件管理 |
| Android SDK | 任意 | 含 `build-tools` |
| Java (JDK) | 17 | Gradle 建置 |
| pnpm | 10.6+ | monorepo 套件管理 |
| Node.js | 20+ | Expo prebuild |

---

## 本地測試

### 一鍵建置

```bash
KEYSTORE_PASSWORD=<密碼> KEY_ALIAS=<alias> KEY_PASSWORD=<key密碼> make android-apk
```

此指令會自動完成以下所有步驟（等同手動執行步驟 1–5）。

### 手動步驟（僅供參考）

```bash
# 在專案根目錄安裝 pnpm 依賴
pnpm install

# 安裝 Ruby gems（在 android/ 目錄下）
cd android
bundle config set --local path 'vendor/bundle'
bundle install
```

### 2. 產生 Android 原生專案

```bash
cd app
pnpm exec expo prebuild --platform android --clean
```

### 3. 設定 local.properties

```bash
echo "sdk.dir=$HOME/Library/Android/sdk" > app/android/local.properties
```

### 4. 驗證建置環境

```bash
cd android
bundle exec fastlane android validate_apk_setup
```

預期輸出：
```
✅ Android SDK: Found
✅ Gradle: Found
✅ Keystore: Found
✅ app.json: Found
✅ All checks passed!
```

### 5. 建置並匯出 APK

```bash
cd android
KEYSTORE_PASSWORD=<你的密碼> \
KEY_ALIAS=<你的 alias> \
KEY_PASSWORD=<你的 key 密碼> \
bundle exec fastlane android build_and_export_apk
```

建置成功後，APK 會輸出至：

```
app/android/app/build/outputs/apk/release/app-v<version>-build<number>-<timestamp>.apk
```

---

## Keystore

> 專案 keystore 位於 `my-release-key.keystore`（專案根目錄）。

若需要建立新的 keystore：

```bash
keytool -genkey -v \
  -keystore my-release-key.keystore \
  -alias my-release-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

---

## GitHub CI

### 必要 Secrets 設定

前往 `Settings → Secrets and variables → Actions` 新增以下四個 secrets：

| Secret 名稱 | 說明 | 取得方式 |
|-------------|------|----------|
| `KEYSTORE_BASE64` | Keystore 檔案的 Base64 編碼 | 見下方指令 |
| `KEYSTORE_PASSWORD` | Keystore 密碼 | 建立 keystore 時設定 |
| `KEY_ALIAS` | Key alias 名稱 | 建立 keystore 時設定 |
| `KEY_PASSWORD` | Key 密碼 | 建立 keystore 時設定 |

**產生 `KEYSTORE_BASE64`：**

```bash
base64 -i my-release-key.keystore | pbcopy   # macOS（複製到剪貼簿）
base64 -w 0 my-release-key.keystore           # Linux（輸出到終端機）
```

將輸出的 base64 字串貼入 `KEYSTORE_BASE64` secret。

### 觸發 CI

CI workflow（`.github/workflows/build-and-export-apk.yml`）在以下情況觸發：

- **推送 tag**：`git tag v1.0.1 && git push origin v1.0.1`
- **手動觸發**：GitHub → Actions → `Build APK` → Run workflow

### CI 流程說明

```
Checkout → pnpm install → expo prebuild → Gradle assembleRelease
  → 簽署 APK → apksigner 驗證 → Upload Artifact → (tag) Create Release
```

---

## Available Lanes

| Lane | 用途 |
|------|------|
| `validate_apk_setup` | 驗證環境（SDK、Gradle、Keystore） |
| `build_and_export_apk` | 本地建置 + 簽署 + 驗證 |
| `ci_export_apk` | CI 建置（JSON 輸出，無互動提示） |

---

## 常見問題

### `expo.core.ExpoModulesPackage` 找不到

**原因**：pnpm monorepo 的 autolinking 解析路徑有誤。

**解法**：確認專案根目錄的 `.npmrc` 包含：

```
public-hoist-pattern[]=*expo-modules-autolinking
public-hoist-pattern[]=*expo-modules-core
public-hoist-pattern[]=*babel-preset-expo
```

然後重新執行 `pnpm install` 並重跑 prebuild。

### `apksigner` 找不到

**原因**：Android SDK `build-tools` 不在 `$PATH`。

**解法**：Fastfile 已自動偵測 `$ANDROID_HOME/build-tools/` 下最新版本，確認 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 環境變數已設定，或 SDK 位於預設路徑 `~/Library/Android/sdk`。
