# Codex Agent Guide

本檔提供 Codex / gemini  在此專案工作的共通規範。

## 對話語言（必須遵守）

- 對話主要使用繁體中文（`zh-TW`）。

## Build and Test Commands

- 開始修改前，先檢查專案內可用的建置與測試入口，例如：`Makefile`、`justfile`、`package.json`、`pyproject.toml`、`go.mod`、`Cargo.toml`、`pom.xml`、`build.gradle`、`Taskfile.yml`。
- 優先使用專案既有指令，不要自行發明流程；若同時存在多種入口，優先使用專案文件或腳本明示的主流程。
- 新 feature 開始前，先執行一次最小 `toolchain smoke`；至少確認 `lint`、`test`、`build`、Storybook build、backend test import path、package manager shim 可正常使用。
- 若專案使用 Expo / EAS，`Expo Orbit` 可作為本機開發與 QA 的標準輔助工具，用於快速啟動 simulator、安裝 build、驗證更新；但 Orbit 不是 CI 檢查，不可取代自動化測試或視覺回歸流程。
- 若專案已配置 `Maestro` flow，應將其視為 mobile UI regression / smoke test 的正式入口之一；涉及跨畫面主流程、登入、上傳、狀態轉換或其他高價值 user journey 時，優先執行最相關的 `Maestro` flow。
- 先執行最小必要驗證，再依改動範圍擴大：
  - 單檔或小範圍修改：先跑最相關的 build、lint、test。
  - 共用元件、基礎設施、相依性或跨模組修改：除局部驗證外，也要跑更完整的 build 與 test。
- 若專案同時提供 `lint`、`test`、`build`，預設執行順序為：`lint` → `test` → `build`。
- 在完成任何實作類變更前，必須執行可用的自動化 regression test suite；若專案沒有明確標示 regression suite，則以專案既有之 `lint`、`test`、`build` 中與改動最相關、且可代表回歸風險者作為最低要求；若專案尚無可執行測試入口，必須明確說明缺口與略過原因。
- 若專案同時提供單元/整合測試與 `Maestro` flow，應依改動風險組合執行；`Maestro` 主要負責驗證真實使用者流程與跨畫面互動，不可取代單元、契約或 API 層測試。
- 若修改 shared UI、設計系統元件或跨平台重用畫面，應同步補上 Storybook stories 與 visual regression 入口，並優先接到 Chromatic；若因成本或環境限制不使用 Chromatic，必須在變更說明中記錄替代方案（例如 Lost Pixel）。
- 若沒有自動化測試，必須明確說明，並至少執行可用的語法檢查、型別檢查或建置檢查。
- 回報結果時，需清楚列出實際執行的命令，以及成功、失敗、略過的原因。

## Agent
- 執行此專案任務時，agent 應先評估是否適合委派；僅在任務可切分、可平行化、或需要獨立探索時優先使用 subagent 協助處理，不需要等待使用者額外提示；若判斷不適合委派，需在回報中簡要說明原因。

## 測試要求
- 任何網頁 UI、自動化驗證或手動測試流程，若當前 session 已提供 Chrome MCP，必須優先使用 Chrome MCP。
- 若當前 session 未提供 Chrome MCP，必須先在回報中明確說明，再由使用者決定是否改用其他測試方案；未經使用者同意，不得自行切換到其他瀏覽器測試方案。
- 任何 mobile app 端的端對端流程驗證，若專案已提供 `Maestro` flows，應優先使用 `Maestro` 執行；尤其是登入、建立資料、上傳、背景處理狀態刷新、錯誤重試等核心 user flow。
- 凡是登入後流程，至少要有一個測試明確驗證登入回傳的 session/token 會被後續 query/mutation 真正使用。
- Expo Router 專案若以 `app/` 作為 project root，route file 必須位於實際 router root；必要時以 wrapper re-export，不能只放功能檔而未掛入 route tree。
- `Maestro` flow 內使用的文案、`appId`、初始資料與失敗案例必須和現況程式碼一致，並優先使用 deterministic fixture。
- `Maestro` 僅用於 mobile UI / E2E 驗證，不取代 Chrome MCP 在 web UI、管理後台、文件頁面或其他瀏覽器情境的優先權。
- 回報 `Maestro` 驗證時，需列出實際執行的 flow、目標平台（iOS / Android）、成功或失敗結果，以及未覆蓋的風險區段。

## Review Expectations

- 在提交前，必須以 code review 心態重新檢查自己的修改，而不是只確認「能動」。
- 至少檢查以下項目：
  - 是否引入功能回歸、邏輯漏洞或錯誤處理缺口。
  - 是否影響相容性、部署流程、設定檔或資料格式。
  - 是否需要補測試、文件、註解、migration 或 release note。
  - 是否有安全性、權限、機敏資訊或輸入驗證風險。
  - Markdown 連結、範例指令是否符合本檔規範。
- 若有未完成驗證、已知風險或無法在本次處理的事項，必須明確揭露，不可省略。

## Git 工作流程

當任務包含實作且已完成本次可交付修改時，agent 應執行以下 Git 工作流程：

1. 檢視修改內容
   - 使用 `git status` 查看所有改動的檔案。
   - 使用 `git diff` 查看具體的修改內容。
   - 確認修改符合預期。
2. 進行 Commit
   - 使用 `git add` 將改動加入 staging area。
   - 使用 `git commit` 提交改動，並撰寫清楚的 commit message。
   - Commit message 應遵循慣例，例如：`feat:`、`fix:`、`test:`、`docs:`。
3. 確認狀態
   - 使用 `git status` 確認工作目錄已乾淨。
   - 可選：使用 `git log -1 --stat` 確認 commit 內容。

重要：

- 不要等待用戶提醒，在完成本次可交付的程式碼修改後自動執行上述 git 工作流程。
- 不得平行執行可能操作 Git index、staging area 或工作樹狀態的指令；`git add`、`git commit`、`git status`、`git diff` 等流程應以單線程依序執行，避免產生 `.git/index.lock` 或狀態競爭。
- 進入子目錄工作前，請先檢查該子目錄是否有 `AGENTS.md`，並遵循其額外指示。

## 問題紀錄規範

- 若在執行過程中遇到阻塞開發、影響驗證、需額外診斷，或可能重複發生的問題，必須記錄問題處理過程。
- 若同一阻塞超過一次回合仍未排除，必須落 `issuelog`。
- 問題分析可視需要使用 `kubectl`、`gcloud`、`helm` 等指令輔助。
- 記錄內容必須包含：問題分析、root cause、解決方法。
- 記錄位置：最接近正在處理資料夾的 [issuelog/][issuelog]。
- 若 [issuelog/][issuelog] 不存在，必須先建立再記錄。

## 文件連結規範

- `docs/` 內文件參考必須使用 Markdown reference-style links（`[文字][ref]`），並在文末提供 `[ref]: path` 定義，不可使用純文字或反引號路徑。


## Active Technologies
- Expo, React Native, TypeScript, Vitest, NativeWind, TanStack Query (client baseline)
- Python 3.13, uv, Pydantic, python-dotenv, pytest (backend baseline)
- TypeScript 5.x for Expo mobile app and shared package; Python 3.13 for backend API and worker + Expo-managed React Native, NativeWind, TanStack Query, shared TypeScript contract package, FastAPI, Pydantic v2, `uv`, `python-dotenv`, `pytest` (001-voice-notes-summary)
- Mobile bearer token in secure storage; backend SQLite for notes/jobs/users; local filesystem-backed audio storage for development; shared contract package for enums/DTOs (001-voice-notes-summary)

## Recent Changes
- 2026-03-20: Established project constitution baseline around Expo, React Native, TypeScript, Vitest, NativeWind, and TanStack Query
- 2026-03-20: Expanded constitution to prioritize shared web/mobile logic, cross-platform visual consistency, and mandatory regression-suite execution before finalization
- 2026-03-20: Added governance for CI visual regression on shared UI and positioned Expo Orbit as a local QA helper instead of a CI gate
- 2026-03-23: Added backend governance for Python 3.13 + uv, Pydantic validation, env-based secrets, centralized logging/custom exceptions, pytest coverage, and Swagger endpoint descriptions
