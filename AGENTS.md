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
- **共用元件、基礎設施、相依性或跨模組修改**：局部驗證外，也要跑完整 build + test。
- 完成任何實作類變更前，必須執行可用的 regression test suite；若無明確 regression suite，以 lint、test、build 中與改動最相關者作為最低要求。
- 若無可執行測試入口，必須明確說明缺口與略過原因。
- 回報結果時，需清楚列出實際執行的命令，以及成功、失敗、略過的原因。

### Expo / EAS 特殊規則

- 涉及 Fastlane、Gradle、Expo prebuild、GitHub Actions 或其他 build automation 時，開始實作前先盤點實際 repo 結構、工具執行目錄與關鍵路徑（`app/`、`app/android/`、`android/fastlane/`、keystore、artifact output）。

> ⚠️ **禁止**：直接假設專案符合標準單體 repo 目錄佈局。

- 若使用 Expo + pnpm monorepo，涉及 native build、Expo prebuild 或 CI 時，必須先確認 Expo modules autolinking 所需的 hoist / install 設定可在本機與 CI 一致重現。
- 建置流程若依賴 `expo prebuild --clean`，必須檢查並補回會被清掉的必要設定（`local.properties`、`sdk.dir`、暫存產物路徑）。
- `Expo Orbit` 可作為本機開發與 QA 的輔助工具（快速啟動 simulator、安裝 build、驗證更新），但**不是 CI 檢查，不可取代自動化測試或視覺回歸**。
- Expo Router 專案若以 `app/` 作為 project root，route file 必須位於實際 router root；必要時以 wrapper re-export，不能只放功能檔而未掛入 route tree。

### 原生 Build / 簽章

- 當 build / CI 需要 keystore、token 或其他 secrets 時，preflight 必須明確驗證 secret contract、格式限制與必要欄位，避免錯誤延後到編譯、簽章或部署階段才暴露。

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

## Agent 委派原則

執行任務前，agent 應先評估是否適合委派：

- **適合委派**：任務可切分、可平行化、或需要獨立探索。
- **不適合委派**：需說明原因。
- 不需要等待使用者額外提示，自行判斷並執行。

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

[issuelog]: ./issuelog/
