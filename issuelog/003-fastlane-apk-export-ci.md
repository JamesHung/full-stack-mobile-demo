# 003-fastlane-apk-export CI 問題紀錄

## 問題 1: Signing config regex injection 失敗

**分析**: Fastfile 中使用 regex gsub 替換 expo-prebuild 產生的 `build.gradle` 中的 `signingConfigs` 區塊。regex `/signingConfigs \{.*?^        \}/m` 無法正確匹配 CI 環境產生的 build.gradle 結構。

**Root Cause**: Regex multiline 匹配依賴特定的縮排和換行格式，而 expo prebuild 產生的 build.gradle 在不同環境下縮排可能不同。此外，gsub 同時匹配了 `buildTypes` 中的 debug block。

**解決方法**: 改用 line-by-line parser，以 brace depth tracking 精確定位 `signingConfigs` 區塊結束位置，插入 release config。只在 release buildType 中替換 `signingConfigs.debug` → `signingConfigs.release`。抽出為 `inject_release_signing` 共用方法。

**PR**: #7

## 問題 2: PKCS12 keystore KEY_PASSWORD 不可為空

**分析**: CI Build APK 在 `packageRelease` 步驟報 `KeytoolException: Failed to read key from store`。

**Root Cause**: Keystore 為 PKCS12 格式，PKCS12 規範要求 key password 必須等於 store password。原先 KEY_PASSWORD secret 設為空值。

**解決方法**: 將 `KEY_PASSWORD` GitHub secret 更新為與 `KEYSTORE_PASSWORD` 相同的值 (`00000000`)。

## 問題 3: expo prebuild --clean 後缺少 local.properties

**分析**: 執行 `expo prebuild --clean` 會刪除整個 `app/android/` 目錄並重建，導致 `local.properties`（含 `sdk.dir`）遺失。Gradle 無法找到 Android SDK。

**Root Cause**: expo prebuild 不會自動產生 `local.properties`。

**解決方法**: 在 Fastfile 的 Gradle build 步驟前，自動偵測 `ANDROID_HOME` / `ANDROID_SDK_ROOT` / `~/Library/Android/sdk`，並寫入 `local.properties`。

## 最終結果

- ✅ Local build: `fastlane android build_and_export_apk` 成功
- ✅ CI Build APK workflow run #23486162049 成功
- ✅ APK artifact 可下載 (72MB)
- ✅ APK 簽名驗證通過 (v2 scheme)
- ✅ APK package: `com.demo.voicenotes` v1.0.0
