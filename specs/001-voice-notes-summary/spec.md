# Feature Specification: Voice Notes Summary

**Feature Branch**: `001-voice-notes-summary`  
**Created**: 2026-03-23  
**Status**: Draft  
**Input**: User description: "Voice Notes Summary 一個 cross-platform 行動 app，讓使用者可以錄音或上傳語音筆記，後端將音檔轉成文字並產生摘要、標籤與狀態結果。 Primary User 忙碌的個人使用者，想快速記錄想法、會議重點、待辦或靈感。 現在很多想法發生得很快，使用者通常來不及打字整理。 直接錄音雖然方便，但後續很難回看與搜尋。 如果系統能自動把錄音整理成文字與摘要，語音筆記才真的可用。"

## Clarifications

### Session 2026-03-23

- Q: 處理中的 note 應如何刷新狀態？ → A: 列表手動刷新，detail 在 `uploaded` / `processing` 時短暫自動輪詢
- Q: 是否要把 MVP 排除項明確寫進 spec？ → A: 加入明確 Out of Scope 清單，沿用原始需求中的排除項

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create And Upload A Voice Note (Priority: P1)

忙碌的個人使用者可以登入 app，建立一筆新的語音筆記，直接錄音或選擇現有音檔上傳，並立即看到這筆 note 已進入可追蹤的處理流程。

**Why this priority**: 這是 MVP 的核心價值入口。若不能穩定建立並上傳語音筆記，後續摘要、標籤與狀態追蹤都沒有意義。

**Independent Test**: 可以透過 demo 帳號登入、建立 note、錄音或上傳音檔、成功建立 note record 並看到狀態變成 `uploaded` 或 `processing` 來獨立驗證。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且在 note list，**When** 使用者點擊新增並完成錄音上傳，**Then** 系統必須建立一筆 note 並將狀態顯示為 `uploaded` 或 `processing`
2. **Given** 使用者選擇不支援格式或超過限制的音檔，**When** 使用者嘗試上傳，**Then** 系統必須阻止上傳並顯示明確錯誤訊息

---

### User Story 2 - Track Processing Status In The List (Priority: P2)

使用者可以在 note list 中看到每筆語音筆記的處理狀態，並手動重新整理結果，不會誤以為 app 卡住或上傳失敗。

**Why this priority**: 這個產品的關鍵體驗是非同步處理。若狀態不可見，使用者無法理解系統是否正在工作。

**Independent Test**: 可以透過建立一筆 note 後回到列表，觀察 `uploaded`、`processing`、`completed` 或 `failed` 的變化，並使用手動刷新更新畫面，獨立驗證此流程。

**Acceptance Scenarios**:

1. **Given** 某筆 note 尚在背景處理，**When** 使用者開啟 note list 或手動刷新，**Then** 系統必須顯示最新狀態與最後更新時間
2. **Given** 某筆 note 已完成處理，**When** 使用者返回列表，**Then** 系統必須顯示摘要預覽、標籤摘要或其他可辨識的完成結果

---

### User Story 3 - Review Results And Recover From Failures (Priority: P3)

使用者可以打開 note detail，查看 transcript、summary、tags；若處理失敗，也能看到失敗訊息並觸發 retry。

**Why this priority**: 建立完整閉環需要包含成功結果與失敗處理，才能在 demo 中清楚呈現 async product experience。

**Independent Test**: 可以透過打開已完成 note 驗證 transcript/summary/tags 顯示，並透過失敗 note 驗證錯誤訊息與 retry 動作，獨立交付產品價值。

**Acceptance Scenarios**:

1. **Given** 某筆 note 狀態為 `completed`，**When** 使用者打開 detail 頁，**Then** 系統必須顯示 transcript、summary 與 tags
2. **Given** 某筆 note 狀態為 `failed`，**When** 使用者打開 detail 頁並執行 retry，**Then** 系統必須重新建立處理工作並將狀態改回 `uploaded` 或 `processing`

### Edge Cases

- 使用者建立 note 後中斷上傳，系統必須避免產生看似成功但沒有音檔可處理的假完成資料
- 使用者重複點擊上傳或 retry，系統必須避免建立重複 processing jobs
- 背景 worker 完成處理時，使用者停留在舊頁面，手動刷新後必須能看到最新結果
- note detail 在 `uploaded` 或 `processing` 狀態下可短暫自動輪詢；離開 detail 或進入 terminal state 後必須停止輪詢，避免無效請求
- transcription 或 summarization 失敗時，錯誤原因必須可被使用者辨識為可重試或需更換音檔
- 空白 transcript、極短音檔或純噪音音檔不得被標記為正常完成且沒有任何提示
- 使用者只能看到自己的 notes，不可透過 note id 讀取其他人的資料

## Out Of Scope

- 多人協作
- 即時語音 streaming transcription
- push notification
- complex search ranking
- folders、notebooks 或 project grouping
- rich transcript editing
- share / export PDF
- offline-first sync
- multi-language translation
- full RAG 或 notes chat

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require authentication before a user can list or view notes.
- **FR-002**: System MUST support a low-friction MVP sign-in flow through a demo login action backed by a user session.
- **FR-003**: System MUST allow authenticated users to create a new voice note record.
- **FR-004**: System MUST allow authenticated users to upload an audio file recorded in-app or chosen from device storage.
- **FR-005**: System MUST validate file type and file size before accepting an audio upload.
- **FR-006**: System MUST store each note with a shared status from this enum: `draft`, `uploaded`, `processing`, `completed`, `failed`.
- **FR-007**: System MUST create a background processing job after a valid audio upload is attached to a note.
- **FR-008**: System MUST expose a note list API and UI showing title, created time, current status, and summary preview when available.
- **FR-009**: System MUST expose a note detail API and UI showing transcript, summary, tags, and error information when applicable.
- **FR-010**: System MUST let the user manually refresh list and detail results.
- **FR-010a**: System MUST keep note list updates manual-refresh driven, while note detail MAY auto-refresh only when the note is in `uploaded` or `processing`.
- **FR-011**: System MUST allow retrying a failed note, creating a new processing attempt without losing the previous note record.
- **FR-012**: System MUST restrict note access so users can only view and mutate their own notes.
- **FR-013**: Backend processing MUST persist transcript, summary, tags, and completion metadata when processing succeeds.
- **FR-014**: Backend processing MUST persist a machine-readable failure reason and user-visible error message when processing fails.

### Technical Constraints *(mandatory)*

- **TC-001**: Client implementation MUST assume Expo-managed React Native + TypeScript unless an approved exception is recorded.
- **TC-002**: New screen and component styling MUST use NativeWind by default; any alternative styling approach MUST be justified.
- **TC-003**: Remote data flows MUST use TanStack Query for fetching, caching, mutation, polling, and invalidation behavior.
- **TC-004**: Changed TypeScript behavior MUST have Vitest coverage at the lowest practical layer, including status mapping, query adapters, and shared contract helpers.
- **TC-005**: The spec MUST define loading, empty, error, and retry expectations for sign-in, note list, create note, upload, and note detail flows.
- **TC-006**: Shared note status definitions, DTOs, validation helpers, and formatting logic MUST live in a shared package consumed by mobile and backend.
- **TC-007**: Cross-platform consistency MUST be preserved by sharing screen hierarchy, state language, and status badge semantics across iOS and Android.
- **TC-008**: The implementation MUST provide a single repo-level developer workflow for bootstrapping, running mobile, running backend, and executing regression checks.
- **TC-009**: Shared UI introduced for reusable note cards, status badges, or result panels MUST define Storybook stories and a CI visual regression path through Chromatic.
- **TC-010**: Backend implementation MUST use Python 3.13 and `uv` for dependency and environment management unless an approved exception is recorded.
- **TC-011**: Backend structured data boundaries MUST use Pydantic models for request, response, settings, and domain validation.
- **TC-012**: Backend code MUST follow PEP 8 and MUST centralize logging plus custom exception classes for domain and transport failures.
- **TC-013**: Backend secrets MUST come from environment variables; local development MAY use `.env` files through `python-dotenv`, and credentials MUST NOT be hardcoded.
- **TC-014**: Backend changes MUST include `pytest` coverage with a target above 80 percent for the affected backend package or service.
- **TC-015**: Every new or changed backend endpoint MUST include a Swagger-visible description in the generated API schema.

### Key Entities *(include if feature involves data)*

- **User**: Authenticated person who owns notes and can only access their own records.
- **VoiceNote**: Primary record for an uploaded or recorded audio note, including title, status, summary preview, transcript, error state, and timestamps.
- **AudioAsset**: Metadata about the uploaded source file, including storage key, MIME type, duration, and file size.
- **ProcessingJob**: Background job that tracks async transcription and summarization attempts for a note.
- **Tag**: Lightweight label extracted from the processed transcript and attached to a note for later scanning.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can create and upload a new voice note from iOS or Android in no more than 5 UI actions after reaching the note list.
- **SC-002**: In the demo environment, a newly uploaded note transitions from `uploaded` to a terminal state (`completed` or `failed`) within 60 seconds for audio files up to 5 minutes.
- **SC-003**: Completed notes display non-empty transcript, summary, and at least one tag in 95 percent of successful processing runs using the demo dataset.
- **SC-004**: Failed notes surface a visible error state and a retry affordance in both note list and note detail without requiring app restart.
- **SC-005**: The shared status enum and note payload contracts are consumed by both the mobile app and backend implementation rather than duplicated locally.
