# Codex Agent Guide

本檔提供 Codex / Gemini 在此專案工作的共通規範。  
**對話語言**：一律使用繁體中文（`zh-TW`）。

---

## Tech Stack

| Surface    | Stack                                                                 |
|------------|-----------------------------------------------------------------------|
| Mobile     | Expo 52, React Native 0.76, Expo Router 4, NativeWind 4, TanStack Query 5, TypeScript 5.x |
| Backend    | Python 3.13, uv, FastAPI, Pydantic v2, SQLite, python-dotenv         |
| Shared     | TypeScript 5.x contract package（enums / DTOs）                       |
| Test / CI  | Vitest, pytest, Maestro CLI, GitHub Actions                           |
| Auth       | Mobile bearer token（secure storage）；backend SQLite sessions        |
| Storage    | 開發環境：backend 本地 filesystem 音檔；per-run smoke artifact（JUnit、Maestro output、debug logs）|

---

## Build & Test

### 前置確認（每次開始前）

- 先盤點可用的建置與測試入口：`Makefile`、`justfile`、`package.json`、`pyproject.toml`、`go.mod`、`Cargo.toml`、`pom.xml`、`build.gradle`、`Taskfile.yml`。
- 優先使用專案既有指令，不自行發明流程；多種入口並存時，依專案文件或腳本明示的主流程為準。
- 新 feature 開始前執行一次 toolchain smoke，至少確認 `lint`、`test`、`build`、Storybook build、backend test import path、package manager shim 可正常運作。
- 若 workflow 涉及多個 runtime（Node.js、pnpm、Ruby、Java、Android SDK），先確認已驗證版本，並**同步固定**於 workflow、腳本與文件，不得只更新其中一處。

### 執行規則

- 預設執行順序：`lint` → `test` → `build`。
- **單檔或小範圍修改**：跑最相關的 lint、test。
- **功能實作、重構或跨模組修改**：必須執行 `make verify`。
- 完成任何實作類變更前，必須執行可用的 regression test suite；若無明確 regression suite，以 lint、test、build 中與改動最相關者作為最低要求。
- 若無可執行測試入口，必須明確說明缺口與略過原因。
- 回報結果時，需清楚列出實際執行的命令，以及成功、失敗、略過的原因。

### 品質硬需求（Codex / Copilot / Gemini 一律適用）

- 品質**不得**依賴 agent 自律或人工記憶；必須依賴 repo 內的 hook、`make verify`、`make doctor`、`make enforce` 與 CI gate。
- 修改下列任何檔案或目錄時，提交前**必須**執行 `make verify`：
  - `app/**`
  - `backend/**`
  - `packages/smoke-kit/**`
  - `scripts/maestro/**`
  - `.maestro/**`
  - `smoke.config.json`
  - `smoke-plan.yml`
  - `Makefile`
  - `.github/workflows/**`
- 修改下列 smoke 相關 surface 時，提交前**必須**執行 `make doctor` 確認工具鏈完整：
  - `packages/smoke-kit/**`
  - `scripts/maestro/**`
  - `smoke.config.json`
  - `smoke-plan.yml`
- 新增或修改 Makefile target 時，提交前**必須**實際執行該 target 並確認輸出符合預期；不得只寫 target 就 commit。
- `git commit --no-verify` 只可作為工具故障時的暫時逃生口，不得當成日常流程；若使用，合併前**必須**補跑完整檢查並把原因記錄到 `issuelog/`。
- 任何 agent 在 `make verify` 或 CI gate 未通過前，**不得**宣稱變更已完成、可安全合併、或品質已受保證。

### smoke-kit 工具

- smoke-kit 是一個 TypeScript CLI 工具（位於 `packages/smoke-kit/`），用於自動化 smoke test 與 CI guardrails。
- 支援的命令：`run`、`preflight`、`plan`、`enforce`、`install-hook`、`doctor`。
- `run <platform>` 會依序：啟動 backend → 等待 health check → 啟動 Metro → 啟動 emulator → 執行 Maestro flow → 收集結果。
- `plan` 會根據 `smoke-plan.yml` 分析 git diff，決定哪些檢查需要執行。
- `enforce` 是 policy coordinator：plan → validate → 平行執行 lint/shell-validation → 依序執行 smoke tests → 記錄 metrics。
- `doctor` 會檢查 Node.js、pnpm、uv、Maestro、emulator、smoke.config.json、smoke-plan.yml 等工具鏈是否完整。
- `smoke.config.json` 是 smoke-kit 的宣告式設定，包含 service 啟動、flow 路徑、artifact 輸出等，修改前應先閱讀其結構。
- 詳細使用說明見 [ci-guardrails][ci-guardrails]。

### CLI Flag 與依賴驗證

- 使用 Expo CLI flag（如 `--dev-client`、`--go`）之前，**必須**在對應 `package.json` 確認相關 package 已安裝（例如 `--dev-client` 需要 `expo-dev-client`）。不可僅因範本、文件或既有腳本使用該 flag 就直接套用。
- 此規則同樣適用於任何 CLI 工具的可選 flag：若 flag 功能依賴額外套件，commit 前必須驗證套件存在。

### Shell 腳本語法驗證

- 修改 `.sh` 檔案後，commit 前**必須**執行 `bash -n <file>` 驗證語法正確。
- 涉及 `if/fi`、`case/esac`、`while/done` 等巢狀結構修改時，額外檢查配對完整性。
- 若同時修改多個 `.sh` 檔案，可使用 `find scripts/ -name '*.sh' -exec bash -n {} \;` 批次驗證。
- 確認腳本中引用的路徑變數（如 `$ROOT_DIR`、`$ARTIFACT_DIR`）有 `:-` 預設值或錯誤提示。
- 確認 `set -euo pipefail` 位於腳本頂部（第一或第二行）。
- 啟動背景程序的腳本必須包含 `trap cleanup EXIT`。
- 違反此規則會浪費至少一個完整的 CI 輪次（Android 45 分鐘 + iOS 60 分鐘）。

### Expo / EAS 特殊規則

- 涉及 Fastlane、Gradle、Expo prebuild、GitHub Actions 或稱之為 build automation 時，開始實作前先盤點實際 repo 結構、工具執行目錄與關鍵路徑（`app/`、`app/android/`、`android/fastlane/`、keystore、artifact output）。

> ⚠️ **禁止**：直接假設專案符合標準單體 repo 目錄佈局。

- 若使用 Expo + pnpm monorepo，涉及 native build、Expo prebuild 或 CI 時，必須先確認 Expo modules autolinking 所需的 hoist / install 設定可在本機與 CI 一致重現。
- 建置流程若依賴 `expo prebuild --clean`，必須檢查並補回會被清掉的必要設定（`local.properties`、`sdk.dir`、暫存產物路徑）。
- `Expo Orbit` 可作為本機開發與 QA 的輔助工具（快速啟動 simulator、安裝 build、驗證更新），但**不是 CI 檢查，不可取代自動化測試或視覺回歸**。
- Expo Router 專案若以 `app/` 作為 project root，route file 必須位於實際 router root；必要時以 wrapper re-export，不能只放功能檔而未掛入 route tree。

### 原生 Build / 簽章

- 當 build / CI 需要 keystore、token 或稱之為 secrets 時，preflight 必須明確驗證 secret contract、格式限制與必要欄位，避免錯誤延後到編譯、簽章或部署階段才暴露。

> ⚠️ **禁止**：修改 generated `build.gradle`、Xcode project 或其他機器產生檔案時，不得使用依賴縮排、空白或固定區塊形狀的 fragile regex 直接替換；應優先使用結構化 parser、AST 或 brace-depth/line-by-line 掃描。

---

## 測試規範

### Web UI 測試

- 若當前 session 已提供 Chrome MCP，任何網頁 UI、自動化驗證或手動測試流程**必須優先使用 Chrome MCP**。
- 若當前 session 未提供 Chrome MCP，必須先在回報中明確說明，再由使用者決定是否改用其他方案；未經使用者同意，不得自行切換。

### Mobile E2E（Maestro）

- Mobile app 端的端對端流程驗證，若專案已提供 Maestro flows，應優先使用 Maestro 執行；尤其是登入、建立資料、上傳、背景處理狀態刷新、錯誤重試等核心 user flow。
- Maestro flow 內使用的文案、`appId`、初始資料與失敗案例必須和現況程式碼一致，並優先使用 deterministic fixture。
- 若專案同時提供單元/整合測試與 Maestro flow，應依改動風險組合執行；Maestro 主要負責驗證真實使用者流程與跨畫面互動，不可取代單元、契約或 API 層測試。
- Maestro 僅用於 mobile UI / E2E 驗證，不取代 Chrome MCP 在 web UI、管理後台或其他瀏覽器情境的優先權。
- 凡是登入後流程，至少要有一個測試明確驗證登入回傳的 session / token 會被後續 query / mutation 真正使用。
- 回報 Maestro 驗證時，需列出：實際執行的 flow、目標平台（iOS / Android）、成功或失敗結果，以及未覆蓋的風險區段。

### Shared UI / 視覺回歸

- 若修改 shared UI、設計系統元件或跨平台重用畫面，應同步補上 Storybook stories 與 visual regression 入口，並優先接到 Chromatic。
- 若因成本或環境限制不使用 Chromatic，必須在變更說明中記錄替代方案（例如 Lost Pixel）。

---

## 任務路由與委派（Task Routing and Delegation）

當團隊調度（team dispatch）技能可用時，Agent 應優先使用該技能，而非嘗試直接完成所有工作。

### 委派原則
符合以下特徵的任務適合委派：
- 範圍明確
- 重複性或機械性工作
- 可獨立驗證
- 可平行化且無緊密耦合

應保留主導權（不委派）的任務涉及：
- 架構決策
- 模糊的需求
- 跨模組的權衡（tradeoffs）
- 風險承擔
- 最終彙整與優先順序判斷

### 路由策略
應使用能可靠完成任務的最低階 Agent：

- **輕量執行器（Lightweight executor）**  
  處理確定性或機械性工作，例如簡單編輯、格式調整、簡易重構、樣板程式碼生成以及明確規範的測試更新。

- **平衡推理 Agent（Balanced reasoning agent）**  
  處理需要適度判斷的任務，例如非顯而易見的 Bug 修復、程式碼理解、小型設計調整或結合多個相關變更。

- **首席 / 前瞻推理 Agent（Lead / frontier reasoning agent）**  
  處理高模糊度或高影響力的工作，包括架構設計、系統邊界定義、任務拆解、風險評估、權衡決策以及最終審核。

### 升級規則
在以下情況應升級至能力更強的 Agent：
- 需求不明確
- 影響多個子系統
- 任務因非瑣碎原因失敗一次
- 委派結果與系統約束衝突
- 正確性取決於架構判斷

### 回退規則
若調度系統或團隊技能不可用，Agent 必須繼續直接執行任務，並明確說明委派功能不可用。

---

## Git 工作流程

完成本次可交付的程式碼修改後，**自動**執行以下流程，無需等待使用者提醒：

1. `git status` — 確認所有改動符合預期。
2. `git diff` — 檢視具體修改內容。
3. `git add` — 將改動加入 staging area。
4. `git commit -m "<type>: <message>"` — 遵循慣例前綴：`feat:`、`fix:`、`test:`、`docs:`。
5. `git status` — 確認工作目錄已乾淨。
6. （可選）`git log -1 --stat` — 確認 commit 內容。

> ⚠️ **禁止**：`git add`、`git commit`、`git status`、`git diff` 必須單線程依序執行，嚴禁平行操作，避免 `.git/index.lock` 或狀態競爭。

**完成標準**：

- 未真正接入主流程、未經實際執行路徑驗證的抽象層、helper 或 reusable action，不視為完成；提交前必須以真實入口命令驗證整體流程。
- 進入子目錄工作前，先檢查該子目錄是否有 `AGENTS.md`，並遵循其額外指示。

---

## Code Review 自查

提交前必須以 code review 心態重新檢查，不只確認「能動」。至少確認以下項目：

- [ ] 是否引入功能回歸、邏輯漏洞 or 錯誤處理缺口
- [ ] 是否影響相容性、部署流程、設定檔或資料格式
- [ ] 是否需要補測試、文件、註解、migration 或 release note
- [ ] 是否有安全性、權限、機敏資訊或輸入驗證風險
- [ ] Markdown 連結、範例指令是否符合本檔規範
- [ ] Maestro flow 文案是否與 React Native UI 一致
- [ ] Shell 腳本是否通過 `bash -n` 驗證
- [ ] CI 設定檔改動是否已驗證 YAML 語法
- [ ] smoke.config.json 與 smoke-plan.yml 是否與實際檔案結構一致
- [ ] 新增或修改的 Makefile target 是否已實際執行驗證

若有未完成驗證、已知風險或無法在本次處理的事項，**必須明確揭露，不可省略**。

---

## 問題紀錄規範

以下情況必須記錄問題處理過程：

- 阻塞開發、影響驗證、需額外診斷，或可能重複發生的問題。
- 同一阻塞超過一個回合仍未排除，必須落 [issuelog][issuelog]。
- 阻塞發生在 CI、build automation、簽章、prebuild 或環境差異時，必須額外寫明本機與 CI 的差異點、實際失敗階段，以及最後如何建立 parity。

**記錄必須包含**：問題分析、root cause、解決方法。  
**記錄位置**：最接近正在處理資料夾的 [issuelog][issuelog]；若目錄不存在，先建立再記錄。  
問題分析可視需要使用 `kubectl`、`gcloud`、`helm` 等指令輔助。

---

## 文件連結規範

`docs/` 內文件參考必須使用 Markdown reference-style links（`[文字][ref]`），並在文末提供 `[ref]: path` 定義，不可使用純文字或反引號路徑。

---

## Recent Changes

詳細變更紀錄請參閱 [AGENTS_CHANGELOG][changelog]。

---

[issuelog]: ./issuelog/
[changelog]: ./AGENTS_CHANGELOG.md
[ci-guardrails]: ./docs/ci-guardrails.md
