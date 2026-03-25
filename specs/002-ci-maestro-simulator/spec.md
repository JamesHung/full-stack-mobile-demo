# Feature Specification: CI Maestro Simulator Runs

**Feature Branch**: `002-ci-maestro-simulator`  
**Created**: 2026-03-23  
**Status**: In Progress  
**Input**: User description: "我想把CI 做好 , 串好maestro local run for android/ios simulator , do it"

## Clarifications

### Session 2026-03-23

- Q: Maestro smoke run should hit real backend/worker or allow mocks/stubs? → A: Local 與 CI 都連真實 backend API + worker
- Q: How should smoke fixture data stay deterministic across runs? → A: 固定 demo 帳號，但每次 run 建立唯一 note/fixture 資料
- Q: When should CI automatically run Android and iOS smoke jobs? → A: 只有 app/backend/shared/.maestro/CI script 相關變更才跑
- Q: What should happen if a CI platform cannot provision its simulator/emulator? → A: 該平台 smoke job 直接 fail
- Q: Should the local smoke command auto-start API and worker services? → A: local smoke 指令自動啟 API + worker，再跑 smoke

### Session 2026-03-24

- Q: Should newArchEnabled be aligned to `true` or `false` across app.json and Podfile.properties.json? → A: Both set to `true` (new architecture is the Expo 52 / RN 0.76 default)
- Q: Should the iOS CI runner pin a specific Xcode version via `xcode-select`, or use the default? → A: Use `macos-latest` with its default pre-installed Xcode (do not pin)
- Q: Is the clean prebuild sequence (expo prebuild --clean → pod install → verify codegen → build) correct? → A: Yes, the exact sequence is correct
- Q: Which iOS Simulator device/OS should CI target? → A: "iPhone 16" with the default iOS version available on the runner
- Q: Is the Maestro `idb` (iOS Development Bridge) dependency for iOS simulator interaction documented for CI? → A: Add `idb` as an explicit CI dependency requirement

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run Deterministic Local Mobile Smoke Tests (Priority: P1)

開發者可以用 repo 既有流程在本機對 Android emulator 與 iOS simulator 執行同一套 Maestro smoke flow，快速確認核心登入後流程在兩個平台都可重現。

**Why this priority**: 沒有穩定的本機重現能力，CI 失敗就難以排查，也無法建立可信的 mobile regression baseline。

**Independent Test**: 啟動目標平台模擬器與 app 後，僅透過文件化的單一入口執行 Android 與 iOS smoke flow，兩者都能完成登入、建立資料與重試流程驗證。

**Acceptance Scenarios**:

1. **Given** 開發者已完成 repo 既有安裝步驟且 simulator 已啟動，**When** 開發者執行文件化的 Android local smoke 指令，**Then** 系統必須在不手動修改 flow 檔案的情況下完成 Android smoke run
2. **Given** 開發者已完成 repo 既有安裝步驟且 simulator 已啟動，**When** 開發者執行文件化的 iOS local smoke 指令，**Then** 系統必須在不手動修改 flow 檔案的情況下完成 iOS smoke run
3. **Given** 開發者尚未手動啟動 backend API 或 worker，**When** 開發者執行 local smoke 指令，**Then** 系統必須自動啟動所需服務並在 smoke 結束後回報其執行結果

---

### User Story 2 - Trust CI To Enforce The Same Mobile Journey (Priority: P2)

維護者在 pull request 或主要分支驗證時，可以看到 CI 使用與本機一致的 mobile smoke 驗證，避免「本機可跑、CI 不可跑」或「CI 跑了不同流程」的落差。

**Why this priority**: CI 是回歸門檻；若 CI 與本機流程不一致，就無法成為可靠的品質訊號。

**Independent Test**: 觸發一次 CI 後，可確認 mobile smoke job 會明確區分 Android 與 iOS 執行結果，並且使用與本機相同的 smoke flow 與前置需求。

**Acceptance Scenarios**:

1. **Given** 有包含 mobile 相關變更的分支，**When** CI 啟動 regression 驗證，**Then** 系統必須自動執行 Android smoke flow 並回報成功或失敗
2. **Given** 有包含 mobile 相關變更的分支，**When** CI 啟動 regression 驗證，**Then** 系統必須自動執行 iOS smoke flow 並回報成功或失敗
3. **Given** 任何一個平台 smoke flow 失敗，**When** 維護者查看 CI 結果，**Then** 系統必須指出失敗的平台、失敗的 flow，與足以協助重現的輸出資訊
4. **Given** pull request 只修改 smoke 無關的檔案，**When** CI 評估是否執行 mobile smoke，**Then** 系統不得啟動 Android 或 iOS smoke job

---

### User Story 3 - Diagnose Failures Without Guesswork (Priority: P3)

開發者或 reviewer 在 smoke flow 失敗時，可以快速判斷是環境未就緒、app target 不一致、fixture 不一致，還是實際產品流程回歸。

**Why this priority**: 失敗若不可診斷，團隊會傾向跳過或關閉測試，最終讓 CI 失去價值。

**Independent Test**: 人為製造一個已知失敗案例後，執行 local run 或 CI run，都能從輸出中辨識失敗步驟、平台與建議的排查方向。

**Acceptance Scenarios**:

1. **Given** simulator 未啟動或 app 未安裝，**When** 開發者執行 local smoke run，**Then** 系統必須中止並回報缺失的前置條件
2. **Given** flow 使用的 app target、文案或 fixture 與實際 app 不一致，**When** smoke run 失敗，**Then** 系統必須產生可讀的失敗輸出，讓維護者能定位不一致點

### Edge Cases

- Android emulator 或 iOS simulator 尚未啟動時，local run 必須在真正執行 flow 前就失敗並提示缺少的裝置前置條件
- app 已啟動但 target identifier 與 flow 設定不一致時，執行結果必須明確指出是 target 對不上，而不是只顯示泛用失敗
- smoke flow 使用的測試資料若已被污染，系統必須透過 deterministic fixture 或可重複初始化資料避免偶發失敗
- smoke flow 不得依賴前一次 run 遺留的 note、job 或音檔資料；每次 run 都必須建立自己的唯一測試資料
- backend API 或 background worker 未啟動、不可達或處於錯誤狀態時，local run 與 CI 都必須明確失敗，且不得以 mock 或 stub 回應繼續通過 smoke 驗證
- local smoke 自動啟動的 API 或 worker 若在執行中途提前退出，smoke run 必須立即失敗並指出是哪個服務中斷
- 單一平台失敗時，另一平台的結果仍必須被保留，避免整體 job 遮蔽部分訊號
- smoke workflow 的 path filter 不得漏掉會影響登入、API 契約、shared DTO、Maestro flow 或 CI 腳本的變更
- CI 執行環境若無法啟動目標平台模擬器，對應 smoke job 必須直接失敗並保留失敗證據，而不是默默跳過或降級為非阻擋警告

## Assumptions

- 此功能以現有 `.maestro/voice-notes-smoke.yaml` 為基礎延伸，優先讓同一條核心 happy-path / retry-path 可在兩平台重複使用
- smoke 驗證目標聚焦於登入後核心 user journey，不擴張到完整端對端測試矩陣
- repo 會保留既有 `lint`、`test`、`build` 作為一般 regression suite，Maestro 會新增成 mobile UI smoke gate，而非取代其他測試
- CI 應盡量使用與本機相同的入口命令與相同 fixture，避免兩套流程分叉
- smoke 驗證會沿用固定 demo 帳號，但每次 run 都建立唯一 note 與對應 fixture 資料，避免跨 run 汙染
- local smoke 入口會負責自動啟動 backend API 與 worker，減少本機重現前置手續

### Known Issues & Regressions

- **iOS Native Build Regression (2026-03-23)**: Running `make maestro-ios-local` fails with `xcodebuild` error code 65 because ReactCodegen artifacts are incomplete — specifically, `ComponentDescriptors.cpp` for `rngesturehandler_codegen` is missing from `app/ios/build/generated/ios/react/renderer/components/`. Root cause: `app.json` sets `newArchEnabled: true` (boolean) while `ios/Podfile.properties.json` sets `newArchEnabled: "false"` (string). This inconsistency causes the codegen layer to produce incomplete outputs. **Fix**: Update `ios/Podfile.properties.json` to set `"newArchEnabled": "true"` (aligning to the Expo 52 / RN 0.76 default), then run the clean prebuild sequence defined in FR-015. See `issuelog/2026-03-23-ios-smoke-reactcodegen-missing-componentdescriptors.md` for full analysis. All 32 implementation tasks are marked complete, but iOS smoke cannot actually run until this build regression is fixed.
- **iOS CI Job Missing**: The `mobile-smoke.yml` workflow currently contains only the `android-smoke` job. The `ios-smoke` job referenced by FR-008 and FR-016 has not been implemented yet, despite task T019 being marked complete.

## Out Of Scope

- 建立完整的多裝置、多 OS 版本測試矩陣
- 將所有手動 QA 流程都自動化
- 導入雲端裝置農場或第三方 E2E 平台
- 新增與 smoke flow 無關的產品功能
- 將 Maestro 取代現有單元測試、API 測試或 Chrome MCP 的 web 驗證角色

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a documented local entry point for running the mobile smoke flow on Android emulator.
- **FR-002**: System MUST provide a documented local entry point for running the mobile smoke flow on iOS simulator.
- **FR-003**: Local Android and iOS smoke runs MUST execute the same core authenticated user journey unless a platform-specific exception is explicitly documented.
- **FR-004**: The smoke flow MUST validate that the authenticated session returned at sign-in is actually used by subsequent list, create, upload, and retry actions against the real backend API.
- **FR-004a**: Local and CI smoke runs MUST execute against running backend API and background worker services rather than mock or stub responses.
- **FR-005**: System MUST check required preconditions for each local smoke run, including target simulator availability and app installability, before executing the flow.
- **FR-005a**: The local smoke entry point MUST start the required backend API and background worker services automatically before executing the smoke flow.
- **FR-006**: System MUST fail fast with human-readable guidance when local run prerequisites are missing or inconsistent.
- **FR-006a**: If an auto-started backend API or worker process exits, becomes unreachable, or fails health checks during a local smoke run, the run MUST fail with service-specific diagnostics.
- **FR-007**: CI MUST run the Android smoke flow as part of the automated regression path for mobile-impacting changes.
- **FR-008**: CI MUST run the iOS smoke flow as part of the automated regression path for mobile-impacting changes.
- **FR-008a**: The CI trigger for smoke validation MUST include changes under app, backend, packages/shared, `.maestro`, repo-level CI scripts, and workflow definitions, while allowing smoke-unrelated changes to skip the mobile smoke jobs.
- **FR-009**: CI and local runs MUST use the same named smoke flow files and the same deterministic fixture assumptions.
- **FR-009a**: Smoke runs MUST reuse the seeded demo account while generating unique per-run note and fixture data so repeated executions do not depend on previous run state.
- **FR-010**: Each smoke run MUST report the platform, executed flow name, and pass/fail result in a way maintainers can distinguish Android from iOS outcomes.
- **FR-011**: When a smoke run fails, the output MUST identify the failing step or unmet prerequisite closely enough for a developer to retry locally without re-deriving the scenario.
- **FR-011a**: If CI cannot provision the required emulator or simulator for a platform, that platform's smoke job MUST fail and publish its failure context as part of the run evidence.
- **FR-012**: Project documentation MUST describe how to prepare Android emulator and iOS simulator targets, execute the local runs, and interpret common failure modes.
- **FR-013**: The regression workflow MUST preserve non-mobile checks so mobile smoke validation is added to, not substituted for, the existing quality gates.
- **FR-014**: The solution MUST define what minimum evidence is retained from each CI smoke run so reviewers can inspect failures after the job completes.
- **FR-015**: iOS native project MUST build successfully via `expo run:ios` or `xcodebuild` before any Maestro flow can execute. The build pipeline MUST follow this exact sequence: (1) `npx expo prebuild --clean --platform ios` to regenerate the `ios/` directory, (2) `cd ios && pod install` to install CocoaPods dependencies, (3) verify ReactCodegen outputs — specifically that `ComponentDescriptors.cpp` files exist for all codegen targets (e.g., `rngesturehandler_codegen`), and (4) `npx expo run:ios --no-bundler` to build and install the app on the target simulator.
- **FR-016**: The `mobile-smoke.yml` CI workflow MUST contain an `ios-smoke` job that uses a `macos-latest` runner with the default pre-installed Xcode. The `ios-smoke` job MUST mirror the `android-smoke` job structure: checkout → install dependencies (including `idb` for Maestro iOS Simulator interaction) → preflight checks → boot "iPhone 16" simulator with the runner's default iOS version → iOS native build (clean prebuild → pod install → codegen verify → xcodebuild) → run Maestro flows → upload artifacts.

### Technical Constraints *(mandatory)*

- **TC-001**: Client implementation MUST assume Expo-managed React Native + TypeScript unless an approved exception is recorded.
- **TC-002**: Any changed mobile UI behavior exercised by the smoke flow MUST continue to use NativeWind-based styling conventions unless an approved exception is recorded.
- **TC-003**: Network-backed mobile flows covered by Maestro MUST continue to use TanStack Query semantics for loading, retry, invalidation, and refresh behavior.
- **TC-004**: Changed TypeScript behavior that supports the smoke flow MUST have Vitest coverage at the lowest practical layer, or the implementation MUST document why automation is blocked.
- **TC-005**: The sign-in, list refresh, create note, upload sample, failure, and retry states exercised by Maestro MUST each define expected loading, success, and error behavior.
- **TC-006**: Shared copy, contracts, or validation rules relied on by the smoke flow MUST be centralized where both mobile code and supporting services can consume them, or the plan MUST explain why sharing is not appropriate.
- **TC-007**: Android and iOS smoke runs MUST preserve the same screen hierarchy, state labels, and user-visible outcome semantics unless a platform-specific exception is documented.
- **TC-008**: The implementation plan MUST name the automated regression suite to run before finalization, including `lint`, `test`, `build`, backend regression, and Maestro smoke validation.
- **TC-009**: If shared UI elements or reusable screens are adjusted to stabilize the smoke flow, the plan MUST identify the Storybook stories and CI visual regression path to add or update, or explicitly record why they are unaffected.
- **TC-010**: Backend changes supporting the smoke flow MUST use Python 3.13 and `uv` unless an approved exception is recorded.
- **TC-011**: Backend request, response, settings, and domain validation touched by this work MUST continue to use Pydantic models.
- **TC-012**: Backend transport or job-processing failures surfaced to Maestro MUST continue to use centralized logging and custom exception handling conventions.
- **TC-013**: Any secrets or CI credentials needed for smoke execution MUST come from environment-based configuration and MUST NOT be hardcoded in flow files or scripts.
- **TC-014**: Backend changes MUST include `pytest` coverage with a target above 80 percent for the affected backend package or service, or the plan MUST explain why that target cannot yet be met.
- **TC-015**: Any backend endpoint changed to support smoke stability MUST preserve a Swagger-visible description in the generated API schema.
- **TC-016**: Mobile end-to-end verification MUST prioritize Maestro for simulator-based flows on both iOS and Android; alternative mobile E2E tooling is out of scope unless explicitly approved.
- **TC-017**: Any web UI verification needed while implementing this feature MUST use Chrome MCP in this session rather than switching to another browser automation path.
- **TC-018**: The `newArchEnabled` setting MUST be set to `true` in both `app.json` and `ios/Podfile.properties.json` (new architecture is the default for Expo 52 / React Native 0.76). A mismatch between these files — or setting either to `false` — is a build-blocking defect that MUST be resolved before iOS smoke runs can proceed. The fix is to update `ios/Podfile.properties.json` to `"newArchEnabled": "true"` to match `app.json`.
- **TC-019**: The iOS CI smoke job MUST run on a `macos-latest` GitHub Actions runner using the default pre-installed Xcode version (do NOT pin a specific Xcode version via `xcode-select`). The job MUST install `idb` (iOS Development Bridge) as an explicit dependency, since Maestro requires `idb` for iOS Simulator interaction on CI. The iOS CI job MUST boot an "iPhone 16" simulator using the default iOS version available on the runner. The Android smoke job continues to use `ubuntu-latest`.

### Key Entities *(include if feature involves data)*

- **Smoke Flow Definition**: The named cross-platform user journey that covers sign-in, refresh, create, upload, failure, and retry behavior.
- **Simulator Target**: The Android emulator or iOS simulator instance against which a local or CI smoke run is executed.
- **Regression Entry Point**: A documented repo-level command or script that invokes prerequisite checks and the intended smoke flow for a specific platform.
- **Run Evidence**: The logs, step result summary, and failure context retained from each local or CI smoke execution.
- **Deterministic Fixture**: The predictable demo account, sample input, and expected failure/retry path used to keep smoke outcomes reproducible.
- **Run-Scoped Smoke Data**: The unique note title, audio selection context, and retry target created during one smoke execution so the run stays isolated from earlier runs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A contributor can go from a clean checkout to a successful Android local smoke run in 20 minutes or less by following project documentation only.
- **SC-002**: A contributor can go from a clean checkout to a successful iOS local smoke run in 20 minutes or less by following project documentation only.
- **SC-003**: 100% of pull requests that touch mobile runtime behavior receive distinct Android and iOS smoke results in CI instead of a single combined mobile status.
- **SC-004**: When a smoke run fails, reviewers can identify the failing platform and failing step within 5 minutes from retained job evidence.
- **SC-005**: At least 90% of repeated smoke runs against unchanged code and fixtures produce the same outcome across Android and iOS, demonstrating stable regression behavior.
