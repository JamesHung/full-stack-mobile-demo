# smoke-kit CI Pipeline Fixes

**日期**: 2026-03-30  
**PR**: [#9](https://github.com/JamesHung/full-stack-mobile-demo/pull/9)  
**CI Run**: [23730884765](https://github.com/JamesHung/full-stack-mobile-demo/actions/runs/23730884765) ✅

---

## 問題 1：iOS CI Metro 啟動逾時 (HEALTH_CHECK_TIMEOUT)

### 分析
CI 的 `run-local.sh` 使用 `expo start --dev-client` 啟動 Metro，但 `expo-dev-client` 並未安裝於 `app/package.json`。在 macOS CI runner 上，Metro 冷啟動時間超過原本 60 秒的 health check timeout。

### Root Cause
1. `--dev-client` flag 不應使用——專案未安裝 `expo-dev-client`
2. Metro HTTP health check timeout 60s 不足以應對 CI 冷啟動

### 解決方法
- 移除 `--dev-client` flag（影響 `run-local.sh`、`smoke.config.json`、`pipeline.ts`）
- 將 Metro health check timeout 從 60s 增加至 120s
- 失敗時自動傾印 Metro log 以供診斷

---

## 問題 2：Android CI `expo run:android` 非零退出碼

### 分析
`expo run:android --no-bundler` 在 Gradle 建置成功、APK 安裝後，嘗試開啟 deep link `voice-notes-summary://expo-development-client/?url=...`。由於未安裝 `expo-dev-client`，該 intent 無法被 app 處理，導致非零退出碼。`set -euo pipefail` 導致整個 script 中斷。

### Root Cause
`build_and_install_app()` 函式已有 iOS 的容錯處理（檢查 `Build Succeeded` + `Installing on`），但缺少對應的 Android 處理。

### 解決方法
在 `build_and_install_app()` 加入 Android 容錯：檢查 `BUILD SUCCESSFUL` + `Installing` 後忽略 post-install launch 錯誤。

---

## 問題 3：bash 語法錯誤（引入性回歸）

### 分析
在加入 Android 容錯邏輯時，多寫了一個 `fi`，導致 `run-local.sh` line 264 bash syntax error。

### Root Cause
編輯替換原有 `if/fi` 區塊時未正確移除舊的閉合 `fi`。

### 解決方法
移除多餘 `fi`，並使用 `bash -n` 驗證語法正確性。

---

## 修改檔案

| 檔案 | 變更 |
|------|------|
| `scripts/maestro/run-local.sh` | 移除 `--dev-client`、Metro timeout 120s、Metro log dump、Android 容錯 |
| `smoke.config.json` | Metro command 移除 `--dev-client` |
| `packages/smoke-kit/src/orchestrator/pipeline.ts` | 預設 Metro command 移除 `--dev-client` |
