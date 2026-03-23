# Implementation Plan: Voice Notes Summary

**Branch**: `001-voice-notes-summary` | **Date**: 2026-03-23 | **Spec**: `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/spec.md`
**Input**: Feature specification from `/specs/001-voice-notes-summary/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deliver a cross-platform mobile MVP where an authenticated user can create a voice note, upload audio, track async processing status, and review transcript/summary/tags produced by a Python backend worker. The UX keeps note list refresh manual while allowing short-lived note detail polling during `uploaded` and `processing`, and the MVP explicitly excludes collaboration, push notifications, advanced search, offline sync, export, and chat-over-notes features. The plan uses an Expo-managed React Native client, a FastAPI + Pydantic backend with explicit processing jobs, and a shared package for status enums and payload contracts so mobile and backend consume the same note model.

## Technical Context

**Language/Version**: TypeScript 5.x for Expo mobile app and shared package; Python 3.13 for backend API and worker
**Primary Dependencies**: Expo-managed React Native, NativeWind, TanStack Query, shared TypeScript contract package, FastAPI, Pydantic v2, `uv`, `python-dotenv`, `pytest`
**Storage**: Mobile bearer token in secure storage; backend SQLite for notes/jobs/users; local filesystem-backed audio storage for development; shared contract package for enums/DTOs
**Testing**: Vitest for shared/mobile domain logic and query adapters; `pytest --cov=backend --cov-report=term-missing` for backend API, worker, and state transitions with >80% coverage target
**Target Platform**: iOS and Android mobile clients plus a backend API and background worker in the same monorepo
**Project Type**: Full-stack mobile app with backend API, async worker, and shared contracts package
**Performance Goals**: Note list/detail API responses p95 under 500 ms in local/demo environments; status updates visible on next manual refresh; demo audio up to 5 minutes reaches terminal state within 60 seconds  
**Constraints**: Async status clarity is mandatory; note list remains manual-refresh driven while note detail may poll only during in-flight processing; offline-first sync, push notifications, collaboration, advanced search/grouping, export, and chat-over-notes are out of scope; upload validation must reject unsupported formats and oversized files; one active processing job per note; local development must stay runnable from a single repo
**Scale/Scope**: Demo-oriented MVP for a single seeded demo user path, tens of notes, four core screens, one API service, one worker process, and one shared contracts package
**Visual Regression**: Storybook + Chromatic planned for shared UI primitives (`StatusBadge`, `NoteCard`, `ResultPanel`) once the UI workspace is scaffolded
**Backend API Docs**: FastAPI-generated OpenAPI/Swagger descriptions for demo login, note list, note create, audio upload, note detail, and retry endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-design gate: PASS**

- Expo-managed React Native remains the mobile baseline; no deviation is proposed.
- Python backend work is explicitly scoped to Python 3.13 with `uv`.
- Shared modules are identified as `packages/shared` for `NoteStatus`, DTOs, validation helpers, and formatting helpers; no justified duplication is planned.
- TypeScript boundaries are the mobile app, query adapters, and shared DTOs; Pydantic boundaries are auth payloads, note payloads, settings, and worker domain models.
- Regression plan is explicit: `pnpm vitest` for TypeScript logic and `uv run --directory backend pytest --cov=backend --cov-report=term-missing` for backend logic above 80 percent coverage.
- Shared UI coverage is planned through Storybook + Chromatic for `StatusBadge`, `NoteCard`, and `ResultPanel` once those reusable components are implemented.
- NativeWind is the default styling layer for new mobile screens and components.
- TanStack Query owns sign-in, note list, note detail, create note, upload audio, retry, and the detail polling behavior for in-flight notes.
- Backend configuration will use environment variables and `.env` loading via `python-dotenv`; no hardcoded credentials are permitted.
- Backend logging, custom exceptions, and Swagger-visible endpoint descriptions are included in the planned backend architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-voice-notes-summary/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/
│   ├── domain/
│   ├── exceptions/
│   ├── logging/
│   ├── workers/
│   ├── services/
│   ├── settings/
│   └── models/
└── tests/

app/
├── (tabs)/
├── features/
├── components/
├── hooks/
├── lib/
└── providers/

tests/
├── unit/
├── integration/
└── fixtures/

packages/
└── shared/
    └── src/
        ├── contracts/
        ├── enums/
        ├── formatters/
        └── validation/

.storybook/
└── main.ts

Makefile
```

**Structure Decision**: The repo currently contains only planning artifacts, so this plan defines the target full-stack monorepo structure to be scaffolded next: `app/` for Expo mobile, `backend/` for FastAPI API and worker, `packages/shared/` for cross-platform contracts, and `.storybook/` for shared UI regression coverage. This preserves the constitution baseline while keeping a single repo-level workflow.

## Complexity Tracking

No constitution violations are required for this plan.

## Phase 0: Research Output

- Research decisions are documented in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/research.md`.
- All previously open clarifications were resolved by choosing FastAPI for Swagger support, demo-login auth for MVP scope control, SQLite + local file storage for local simplicity, explicit job modeling for async clarity, manual list refresh plus detail polling for in-flight notes, explicit MVP out-of-scope boundaries, and Storybook + Chromatic as the visual regression path.

## Phase 1: Design Output

- Data model is documented in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/data-model.md`.
- API contracts are documented in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/contracts/openapi.yaml`.
- Developer bootstrap expectations are documented in `/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/001-voice-notes-summary/quickstart.md`.

## Post-Design Constitution Check

**Post-design gate: PASS**

- The design preserves Expo + TypeScript on mobile and Python 3.13 + `uv` on the backend.
- Shared contracts are explicitly modeled in `packages/shared` and reflected in the OpenAPI contract plus note status enum.
- Pydantic boundaries are implied by the OpenAPI/auth/note/job schemas and called out in the plan and research.
- Regression expectations remain explicit for Vitest, backend `pytest`, and future Storybook/Chromatic coverage.
- NativeWind and TanStack Query ownership are preserved for mobile implementation.
- Backend logging, custom exceptions, env-based secrets, and Swagger descriptions are all planned as first-class concerns.
