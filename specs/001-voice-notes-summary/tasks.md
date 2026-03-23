# Tasks: Voice Notes Summary

**Input**: Design documents from `/specs/001-voice-notes-summary/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Vitest coverage is REQUIRED for changed frontend/shared behavior. Backend changes REQUIRE `pytest` coverage with a target above 80 percent for the affected backend package or service.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo skeleton, baseline tooling, and developer entrypoints.

- [X] T001 Create the monorepo root manifests in `/Users/hungming-hung/repo/ai-project/full-stack-demo/package.json`
- [X] T002 [P] Define workspace packages and filters in `/Users/hungming-hung/repo/ai-project/full-stack-demo/pnpm-workspace.yaml`
- [X] T003 [P] Add shared TypeScript compiler defaults in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tsconfig.base.json`
- [X] T004 [P] Initialize the Expo mobile app package in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/package.json`
- [X] T005 [P] Initialize the Python backend package with `uv` metadata in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/pyproject.toml`
- [X] T006 [P] Create repo-level developer commands for install, run, and validation in `/Users/hungming-hung/repo/ai-project/full-stack-demo/Makefile`
- [X] T007 [P] Configure NativeWind, Expo, and Babel integration in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/babel.config.js`
- [X] T008 [P] Configure Vitest workspaces and shared test settings in `/Users/hungming-hung/repo/ai-project/full-stack-demo/vitest.config.ts`
- [X] T009 [P] Initialize Storybook and Chromatic configuration in `/Users/hungming-hung/repo/ai-project/full-stack-demo/.storybook/main.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared contracts, backend core services, and app providers required by every user story.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [X] T010 Create shared note status and contract exports in `/Users/hungming-hung/repo/ai-project/full-stack-demo/packages/shared/src/index.ts`
- [X] T011 [P] Implement `NoteStatus`, auth, and note DTO definitions in `/Users/hungming-hung/repo/ai-project/full-stack-demo/packages/shared/src/contracts/note.ts`
- [X] T012 [P] Add shared validation helpers for note and upload payloads in `/Users/hungming-hung/repo/ai-project/full-stack-demo/packages/shared/src/validation/note.ts`
- [X] T013 [P] Add shared formatting helpers for summary preview and timestamps in `/Users/hungming-hung/repo/ai-project/full-stack-demo/packages/shared/src/formatters/note.ts`
- [X] T014 [P] Implement backend environment settings and `.env` loading in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/settings/config.py`
- [X] T015 [P] Establish centralized structured logging in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/logging/logger.py`
- [X] T016 [P] Define backend custom exception classes and HTTP mapping in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/exceptions/errors.py`
- [X] T017 Create backend persistence models for users, notes, assets, and jobs in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/models/db.py`
- [X] T018 [P] Add database session and SQLite bootstrap wiring in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/database.py`
- [X] T019 [P] Implement demo auth token utilities and request guard in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/auth.py`
- [X] T020 [P] Register FastAPI app, middleware, and Swagger metadata in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/main.py`
- [X] T021 [P] Scaffold the background worker loop and job polling service in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/workers/notes.py`
- [X] T022 [P] Configure Expo app providers, query client, and error boundaries in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/providers/AppProviders.tsx`
- [X] T023 [P] Define shared TanStack Query keys and cache helpers in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/queries/keys.ts`
- [X] T024 [P] Add API client plumbing and typed request helpers in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/lib/api/client.ts`
- [X] T025 [P] Sync the published OpenAPI contract with implementation stubs in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/contracts/openapi.yaml`

**Checkpoint**: Foundation ready. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Create And Upload A Voice Note (Priority: P1) 🎯 MVP

**Goal**: Let a signed-in user create a note, upload recorded or selected audio, and see the note enter `uploaded` or `processing`.

**Independent Test**: Sign in with the demo user, create a note, upload an audio file, and verify the created note reaches `uploaded` or `processing` without depending on list/detail polish from later stories.

### Tests for User Story 1

- [X] T026 [P] [US1] Add Vitest coverage for create-note and upload payload helpers in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tests/unit/notes-create-upload.test.ts`
- [X] T027 [P] [US1] Add integration coverage for the mobile create-and-upload flow in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tests/integration/voice-note-create-upload.test.ts`
- [X] T028 [P] [US1] Add `pytest` coverage for demo login, note creation, and audio upload endpoints in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/tests/test_create_upload_flow.py`

### Implementation for User Story 1

- [X] T029 [P] [US1] Implement the demo login API endpoint and seeded user response in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/api/auth.py`
- [X] T030 [P] [US1] Implement note creation and audio upload endpoints with Swagger descriptions in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/api/notes_create.py`
- [X] T031 [P] [US1] Implement note creation, file validation, and job enqueue services in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/note_creation.py`
- [X] T032 [P] [US1] Define mobile auth and create/upload typed adapters in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/api/createNote.ts`
- [X] T033 [P] [US1] Build the sign-in screen and demo login action in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/sign-in.tsx`
- [X] T034 [P] [US1] Build the create note screen with recording/upload controls in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/notes/create.tsx`
- [X] T035 [US1] Implement TanStack Query mutations for demo login, create note, and upload audio in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/queries/useCreateVoiceNote.ts`
- [X] T036 [US1] Wire the worker state transition from `draft` to `uploaded`/`processing` in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/workers/state_transitions.py`
- [X] T037 [US1] Add loading, validation, and upload failure states to the create flow in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/components/CreateVoiceNoteForm.tsx`

**Checkpoint**: User Story 1 is independently functional and demoable as the MVP slice.

---

## Phase 4: User Story 2 - Track Processing Status In The List (Priority: P2)

**Goal**: Show the user their note history in a list, including status, summary preview, and manual refresh behavior.

**Independent Test**: Seed or create notes with mixed statuses, open the list, manually refresh, and verify status badges, timestamps, and summary previews update correctly without opening detail.

### Tests for User Story 2

- [X] T038 [P] [US2] Add Vitest coverage for list item formatting and status badge mapping in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tests/unit/note-list-formatting.test.ts`
- [X] T039 [P] [US2] Add integration coverage for list refresh and status rendering in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tests/integration/note-list-status.test.ts`
- [X] T040 [P] [US2] Add `pytest` coverage for list notes and worker status transitions in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/tests/test_note_list_status.py`

### Implementation for User Story 2

- [X] T041 [P] [US2] Implement the note list API endpoint with user scoping in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/api/notes_list.py`
- [X] T042 [P] [US2] Implement list query and summary preview services in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/note_listing.py`
- [X] T043 [P] [US2] Build reusable status badge and note card components in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/components/NoteCard.tsx`
- [X] T044 [P] [US2] Add Storybook states for note cards and status badges in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/components/NoteCard.stories.tsx`
- [X] T045 [P] [US2] Implement the note list query hook with manual invalidation in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/queries/useNoteList.ts`
- [X] T046 [US2] Build the note list screen with manual refresh and empty/error states in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/(tabs)/index.tsx`
- [X] T047 [US2] Update the worker result writer to maintain `summaryPreview`, `updatedAt`, and terminal status fields in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/processing_results.py`
- [X] T048 [US2] Verify manual refresh invalidation and cross-platform list state consistency in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/hooks/useRefreshNotes.ts`

**Checkpoint**: User Stories 1 and 2 both work independently, and the list makes async processing progress understandable.

---

## Phase 5: User Story 3 - Review Results And Recover From Failures (Priority: P3)

**Goal**: Let the user open note detail, view transcript/summary/tags, and retry failed processing attempts.

**Independent Test**: Open a completed note to verify transcript, summary, and tags render, then open a failed note and verify retry queues a new attempt and updates status.

### Tests for User Story 3

- [X] T049 [P] [US3] Add Vitest coverage for detail polling and retry eligibility logic in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tests/unit/note-detail-polling.test.ts`
- [X] T050 [P] [US3] Add integration coverage for completed and failed detail views in `/Users/hungming-hung/repo/ai-project/full-stack-demo/tests/integration/note-detail-retry.test.ts`
- [X] T051 [P] [US3] Add `pytest` coverage for note detail and retry endpoints in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/tests/test_note_detail_retry.py`

### Implementation for User Story 3

- [X] T052 [P] [US3] Implement note detail and retry endpoints with Swagger descriptions in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/api/notes_detail.py`
- [X] T053 [P] [US3] Implement transcript/result read models and retry orchestration in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/note_detail.py`
- [X] T054 [P] [US3] Build the result panel and retry affordance components in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/components/ResultPanel.tsx`
- [X] T055 [P] [US3] Add Storybook states for completed and failed result panels in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/components/ResultPanel.stories.tsx`
- [X] T056 [P] [US3] Implement the note detail query and retry mutation hooks with in-flight polling in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/queries/useNoteDetail.ts`
- [X] T057 [US3] Build the note detail screen with transcript, summary, tags, and error presentation in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/notes/[noteId].tsx`
- [X] T058 [US3] Stop detail polling on terminal states and on screen exit in `/Users/hungming-hung/repo/ai-project/full-stack-demo/app/features/notes/hooks/useNoteDetailPolling.ts`
- [X] T059 [US3] Route retry failures and worker processing failures through centralized exceptions and logging in `/Users/hungming-hung/repo/ai-project/full-stack-demo/backend/src/services/retry_processing.py`

**Checkpoint**: All three user stories are independently functional, including success and failure recovery paths.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, regression entrypoints, and cross-story quality work.

- [X] T060 [P] Add Maestro smoke flows for sign-in, upload, list refresh, and retry in `/Users/hungming-hung/repo/ai-project/full-stack-demo/.maestro/voice-notes-smoke.yaml`
- [X] T061 [P] Document local bootstrap, validation, and demo commands in `/Users/hungming-hung/repo/ai-project/full-stack-demo/README.md`
- [X] T062 [P] Add backend coverage and regression command targets to `/Users/hungming-hung/repo/ai-project/full-stack-demo/Makefile`
- [X] T063 Run the full TypeScript regression suite and record commands in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/quickstart.md`
- [X] T064 Run the full backend `pytest` regression suite with coverage and record commands in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/quickstart.md`
- [X] T065 Approve Storybook/Chromatic baselines for shared note UI states in `/Users/hungming-hung/repo/ai-project/full-stack-demo/.storybook/main.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup** has no dependencies and starts immediately.
- **Phase 2: Foundational** depends on Phase 1 and blocks all story work.
- **Phase 3: User Story 1** depends on Phase 2 and delivers the MVP.
- **Phase 4: User Story 2** depends on Phase 2 and can run after or alongside User Story 1 if staffing allows.
- **Phase 5: User Story 3** depends on Phase 2 and can run after or alongside User Story 2, though demo sequencing is simpler after User Story 1 exists.
- **Phase 6: Polish** depends on whichever user stories are in scope for the release.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundation and has no dependency on other user stories.
- **US2 (P2)**: Starts after Foundation and can be tested with seeded note data even if US1 UI is incomplete.
- **US3 (P3)**: Starts after Foundation and can be tested with seeded completed/failed notes even if US2 UI polish is incomplete.

### Within Each User Story

- Story tests come first and define the expected behavior.
- Backend API/service work and mobile query adapters can proceed in parallel once tests are in place.
- Reusable UI components should land before final screen composition.
- Screen integration follows query/service wiring.
- Story completion requires loading, error, and retry behavior to be present.

### Parallel Opportunities

- Setup tasks marked `[P]` can run in parallel once the root manifest exists.
- In Foundation, shared package work, backend settings/logging, and app provider setup can proceed in parallel.
- Within each story, backend endpoint/service tasks can run in parallel with mobile component and query tasks.
- Storybook tasks can run in parallel with screen integration once the reusable component API is settled.
- US2 and US3 can be staffed in parallel after Phase 2 if the team uses seeded fixtures for independent validation.

---

## Parallel Example: User Story 1

```bash
Task: "T028 Add pytest coverage for create/upload flow in backend/tests/test_create_upload_flow.py"
Task: "T032 Implement mobile typed adapters in app/features/notes/api/createNote.ts"
Task: "T033 Build sign-in screen in app/sign-in.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T041 Implement note list API endpoint in backend/src/api/notes_list.py"
Task: "T043 Build NoteCard component in app/features/notes/components/NoteCard.tsx"
Task: "T045 Implement useNoteList query hook in app/features/notes/queries/useNoteList.ts"
```

## Parallel Example: User Story 3

```bash
Task: "T051 Add pytest coverage for detail/retry endpoints in backend/tests/test_note_detail_retry.py"
Task: "T054 Build ResultPanel component in app/features/notes/components/ResultPanel.tsx"
Task: "T056 Implement useNoteDetail hook in app/features/notes/queries/useNoteDetail.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Validate the create/upload flow independently.
5. Demo the MVP before expanding scope.

### Incremental Delivery

1. Setup + Foundation establish the shared contracts, providers, and backend core.
2. US1 adds authentication, note creation, upload, and job enqueue.
3. US2 adds note list visibility and manual refresh for async clarity.
4. US3 adds result review, focused polling, and retry handling.
5. Phase 6 finalizes end-to-end smoke coverage, docs, and regression execution.
