# 004-mobile-smoke-kit — 開發回顧

> 時間跨度：2026-03-30，約 3.5 小時（含 CI 等待）
> 13 commits · 64 files · +6,305 LoC
> PR #9 最終 CI：android-smoke ✅ · ios-smoke ✅

---

## 1. Retro：成功 / 失敗 / 浪費回合

### ✅ 成功

| 項目 | 為什麼值得記住 |
|------|---------------|
| **Spec-first 開發** | speckit 產出的 spec → plan → tasks → contracts 讓核心 package 一次到位（CLI + config + orchestrator + health probe），Phase 1 幾乎零返工 |
| **Setup/teardown lifecycle** | 將「emulator 管理」從隱性前提變成 pipeline 內建階段，解決了手動啟停的可重複性問題 |
| **iOS + Android 同步支援** | 一次 PR 同時搞定兩平台 lifecycle，而非分兩個 PR 交叉修 |
| **Issuelog 即時記錄** | 三個 CI 問題當場落 issuelog，含 root cause + 修復方式，未來遇同類問題可直接搜尋 |

### ❌ 失敗 / 浪費回合

| 回合 | 浪費原因 | 可避免？ |
|------|---------|---------|
| `--dev-client` flag 殘留 3 個檔案 | 沿用範本而未驗證 `expo-dev-client` 是否安裝。**僅在 CI 才暴露，本機因有快取而僥倖通過** | ✅ 新增規則：使用 CLI flag 前驗證對應 package 存在 |
| Metro timeout 60s → 120s | 本機熱快取 <5s，CI 冷啟動 >60s。**未考慮 local-vs-CI parity** | ✅ 新增規則：health check timeout 必須以 CI cold-start 為基準 |
| 多餘 `fi` 語法錯誤 | 手動編輯 bash if/fi 巢狀結構，未跑 `bash -n` 驗證 | ✅ 新增規則：bash 腳本修改後必跑 `bash -n` |
| Android deep link exit code | iOS 已有容錯邏輯卻未同步到 Android。**平台對稱性盲區** | ✅ 新增規則：平台容錯必須對稱雙平台 |
| CI 等待時間（~40 min 共 4 輪） | 每次 push 需等 12-17 min 才知結果 | ⚠️ 部分可避免——若先用 `bash -n` + 依賴檢查，可省掉 2 輪 |

### 📊 效率指標

- **Feature commits**: 5/13 (38%)
- **Legitimate fix commits**: 2/13 (15%)
- **CI-iteration / regression commits**: 4/13 (31%)
- **Docs**: 2/13 (15%)
- **結論**：約 1/3 的 commit 是可避免的返工。主因集中在「本機通過 ≠ CI 通過」的驗證盲區。

---

## 2. Rules：應新增到 AGENTS.md 的規則

### Rule 2.1 — CLI Flag 必須驗證對應依賴

```
使用 Expo CLI flag（如 --dev-client、--go）之前，
必須在 package.json 確認對應 package 已安裝。
不可僅因範本或文件使用該 flag 就直接套用。
```

**為什麼值得沉澱**：`--dev-client` 在本機因快取而靜默通過，只在 CI 冷啟動才暴露。此類「隱性依賴」問題極難在 code review 發現，必須靠規則前置攔截。

### Rule 2.2 — Health Check Timeout 以 CI Cold-Start 為基準

```
所有 service health check timeout 必須以 CI cold-start 時間的 2x 為下限。
本機熱快取的啟動時間不可作為 timeout 依據。
若無法確定 CI 時間，至少設 120s。
```

**為什麼值得沉澱**：Metro 本機 <5s、CI >60s 的差距導致整個 pipeline 失敗。此模式適用於所有需要健康檢查的服務啟動場景。

### Rule 2.3 — Bash 腳本修改後必須語法驗證

```
修改 .sh 檔案後，commit 前必須執行 `bash -n <file>` 驗證語法。
涉及 if/fi、case/esac 巢狀修改時，額外檢查縮排配對。
```

**為什麼值得沉澱**：bash 語法錯誤只在執行期才暴露，且 CI 回饋延遲 5-15 分鐘。`bash -n` 是零成本的即時防線。

### Rule 2.4 — 平台容錯邏輯必須對稱

```
為某一平台（iOS/Android）加入容錯或 workaround 時，
必須檢查另一平台是否需要相同處理。
在 PR description 中明確列出「此修改僅適用 X 平台」或「雙平台已同步」。
```

**為什麼值得沉澱**：iOS 的 `Build Succeeded` 容錯存在已久，但 Android 的 `BUILD SUCCESSFUL` 容錯被遺漏。跨平台開發的對稱性盲區是常見返工來源。

### Rule 2.5 — CI 腳本修改必須附 Diagnostic Fallback

```
修改 CI pipeline 的 health check 或 build 步驟時，
必須在失敗路徑加上 log dump（如 cat metro.log），
確保下次失敗時有足夠資訊診斷，而非只看到 "timed out"。
```

**為什麼值得沉澱**：第一次 iOS CI 失敗時只有 "Timed out waiting for Metro"，完全無法判斷是 Metro 沒啟動、crash、還是 binding 錯誤。加入 log dump 後第二次就能精準診斷。

---

## 3. Skills：可抽出的 Reusable Skills

### Skill 3.1 — `ci-fix-loop`

**用途**：Agent 推 CI 後循環監控 → 讀 log → 診斷 → 修復 → 再推的工作流。

```yaml
觸發條件: push 後需等 CI 結果
工作流:
  1. push → 記錄 run_id
  2. 輪詢 check_runs 狀態（漸進式 backoff: 60s → 120s → 300s）
  3. 失敗時：get_job_logs → 搜尋關鍵字 → 分類錯誤
  4. 修復 → bash -n 驗證（如為 shell 腳本）→ 再 push
  5. 成功時：輸出摘要
```

**為什麼值得沉澱**：本次 4 輪 CI iteration 耗時 ~40 分鐘。標準化此流程可減少人工等待，並確保每次修復都附帶驗證步驟。

### Skill 3.2 — `expo-preflight`

**用途**：在 `expo start` / `expo run:*` 之前檢查常見陷阱。

```yaml
檢查項目:
  - --dev-client flag → 驗證 expo-dev-client 在 dependencies
  - --go flag → 驗證 Expo Go 相容性
  - metro port → 確認無佔用
  - app.json scheme → 確認與 deep link 一致
  - iOS: simulator booted
  - Android: emulator booted + adb reverse
```

**為什麼值得沉澱**：Expo CLI 的 flag 與 package 的隱性耦合是反覆出現的問題。此 preflight 可作為 smoke-kit 或 CI 的前置步驟。

### Skill 3.3 — `platform-parity-check`

**用途**：修改涉及特定平台邏輯時，自動掃描另一平台是否有對應處理。

```yaml
觸發條件: 修改含 "android" / "ios" 的條件分支
檢查:
  - 同函式內是否有對稱的 if/else 或 case 分支
  - CI workflow 是否雙平台都有覆蓋
  - error handling / workaround 是否只寫了一半
```

**為什麼值得沉澱**：跨平台專案中「修了 iOS 忘了 Android」是高頻錯誤模式。

---

## 4. Examples：應保存的範例資產

### Example 4.1 — CI Metro Timeout 診斷 SOP

```
位置: issuelog/2026-03-30-smoke-kit-ci-pipeline-fixes.md
價值: 完整記錄了 Metro cold-start timeout 的診斷路徑：
      CI log → 時間軸分析 → dep 檢查 → flag 驗證 → timeout 調整
適用: 任何 CI 上 Metro / Vite / Webpack 健康檢查逾時的場景
```

**為什麼值得保存**：此診斷路徑是通用的——任何 JS bundler 在 CI 冷啟動都可能遇到。記錄完整路徑可讓未來直接跳到 root cause。

### Example 4.2 — `expo run:*` Post-Install Exit Code 容錯模式

```bash
# 模式：build + install 成功但 post-launch 失敗時容錯
if (( build_exit != 0 )); then
  if grep -q "BUILD SUCCESSFUL" "$log" && grep -q "Installing" "$log"; then
    printf "[build-install] Build OK; ignoring launch failure (exit %d)\n" "$build_exit" >&2
    return 0
  fi
fi
```

**為什麼值得保存**：`expo run:android/ios` 在 CI 上常因 deep link launch 失敗而回傳非零，但 build 和 install 實際成功。此模式可直接複用於任何 Expo CI pipeline。

### Example 4.3 — Emulator/Simulator Lifecycle Manager 架構

```
位置: packages/smoke-kit/src/orchestrator/emulator-manager.ts
價值: 完整的 Android emulator + iOS simulator 生命週期管理
      boot / stop / detect / port-cleanup，含 "startedByUs" 追蹤
適用: 任何需要自動管理模擬器的 CI/CD 或開發工具
```

**為什麼值得保存**：此模組解決了「誰啟動的就由誰關閉」的所有權追蹤問題，避免意外關閉使用者手動開啟的設備。

---

## 5. Evals：下次可自動檢查的 Checklist / Tests

### Eval 5.1 — Pre-Push Shell Syntax Gate

```bash
# 加入 Makefile 或 pre-commit hook
lint-shell:
	@find scripts/ -name '*.sh' -exec bash -n {} \; && echo "All shell scripts syntax OK"
```

**為什麼值得自動化**：本次因 `fi` 多餘導致 1 輪 CI 浪費（~5 min CI + 修復時間）。`bash -n` 是 0 成本防線。

### Eval 5.2 — Expo CLI Flag Dependency Check

```bash
# 掃描所有使用 --dev-client 的地方，驗證 expo-dev-client 已安裝
check-expo-flags:
	@if grep -r -- '--dev-client' scripts/ smoke.config.json packages/ --include='*.sh' --include='*.json' --include='*.ts' 2>/dev/null | grep -v node_modules; then \
		jq -e '.dependencies["expo-dev-client"] // .devDependencies["expo-dev-client"]' app/package.json >/dev/null 2>&1 \
		|| (echo "ERROR: --dev-client used but expo-dev-client not installed" && exit 1); \
	fi
```

**為什麼值得自動化**：隱性依賴只在 CI cold-start 暴露。靜態掃描可在 commit 前攔截。

### Eval 5.3 — Platform Parity Assertion

```bash
# 檢查 build_and_install_app 中 iOS 和 Android 的容錯分支數量一致
check-platform-parity:
	@ios_guards=$$(grep -c 'SMOKE_PLATFORM.*ios' scripts/maestro/run-local.sh); \
	 android_guards=$$(grep -c 'SMOKE_PLATFORM.*android' scripts/maestro/run-local.sh); \
	 echo "iOS guards: $$ios_guards, Android guards: $$android_guards"; \
	 if [ "$$ios_guards" -ne "$$android_guards" ]; then \
	   echo "WARNING: Platform guard count mismatch — review for missing parity"; \
	 fi
```

**為什麼值得自動化**：平台對稱性盲區是高頻錯誤。數量不一致是最明顯的信號。

### Eval 5.4 — CI Health Check Timeout Floor

```typescript
// 加入 smoke-kit 單元測試
test("health check timeouts meet CI cold-start minimum", () => {
  const config = loadConfig("smoke.config.json");
  // Metro: CI cold-start 可能 >60s
  expect(config.metro.healthTimeout).toBeGreaterThanOrEqual(90);
  // Backend API: 通常 <10s，但留 30s buffer
  for (const svc of config.services) {
    if (svc.port) {
      expect(svc.healthTimeout ?? 30).toBeGreaterThanOrEqual(30);
    }
  }
});
```

**為什麼值得自動化**：防止未來有人將 timeout 調回不安全的低值。CI 時間成本遠高於多等 30 秒。

### Eval 5.5 — Smoke-Kit CI Regression Checklist

```markdown
每次修改 smoke-kit 或 CI scripts 時的手動 checklist：
- [ ] `bash -n` 通過所有 .sh 檔案
- [ ] `pnpm --filter smoke-kit test` 全部通過
- [ ] smoke.config.json 中無使用未安裝 package 的 CLI flag
- [ ] iOS 和 Android 的容錯邏輯對稱
- [ ] Health check timeout ≥ 90s（Metro）/ ≥ 30s（其他）
- [ ] 失敗路徑有 diagnostic log dump
```

**為什麼值得保留**：即使部分項目已自動化，保留完整 checklist 作為新人 onboarding 和 code review 的參考。
