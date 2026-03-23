# Research: Voice Notes Summary

## Decision 1: Use Expo-managed React Native for the mobile client and Python 3.13 + FastAPI for backend surfaces

- **Decision**: The implementation target is an Expo-managed React Native mobile app, paired with a Python 3.13 backend API and background worker built around FastAPI, Pydantic v2, `uv`, and `python-dotenv`.
- **Rationale**: This matches the repo constitution, preserves cross-platform delivery consistency, and gives the backend native Swagger/OpenAPI support required by governance.
- **Alternatives considered**:
  - A pure mobile-only prototype without backend processing. Rejected because the product value depends on async transcription and summarization.
  - A Node.js backend. Rejected because the constitution requires Python 3.13 + `uv` for server surfaces unless explicitly justified.

## Decision 2: Use demo login backed by a seeded user account for MVP authentication

- **Decision**: MVP authentication will expose a demo login action that issues a bearer token for a seeded demo user, while keeping the auth contract extensible to email/password later.
- **Rationale**: The product requires authenticated note ownership, but demo login minimizes product friction and reduces scope while still validating per-user access rules.
- **Alternatives considered**:
  - Full email/password registration and reset flows. Rejected because they expand MVP scope without improving the core voice-note experience.
  - Anonymous usage. Rejected because notes must be scoped to a user and the requirements explicitly call for authenticated access.

## Decision 3: Persist notes and jobs in SQLite for local development, store uploaded audio on the local filesystem in dev

- **Decision**: Local development will use SQLite for note/job persistence and a filesystem-backed audio storage directory for uploaded files. The storage interface should remain replaceable with object storage later.
- **Rationale**: This keeps local setup simple, supports a single-repo demo workflow, and is sufficient for MVP async processing while the project is still scaffold-first.
- **Alternatives considered**:
  - PostgreSQL plus S3-compatible storage. Rejected for now because it increases local setup cost before the product loop is proven.
  - In-memory storage. Rejected because retry, status refresh, and result inspection need durable state across app/backend restarts.

## Decision 4: Split note creation from audio upload and drive processing through an explicit job record

- **Decision**: The API contract will create a note record first, then attach audio through a dedicated upload endpoint, which in turn enqueues a processing job.
- **Rationale**: This makes status transitions explicit, improves failure visibility, and cleanly represents `draft -> uploaded -> processing -> completed|failed`.
- **Alternatives considered**:
  - A single multipart endpoint that creates and uploads in one step. Rejected because it hides state transitions and makes retry/error analysis harder.
  - Direct synchronous transcription during upload. Rejected because async processing is a first-class product concept and must not block the mobile UX.

## Decision 5: Share note status, DTOs, and validation helpers through a dedicated shared package

- **Decision**: Introduce a `packages/shared` workspace containing the `NoteStatus` enum, note DTOs, API payload types, and lightweight validation/formatting helpers reused by mobile and backend.
- **Rationale**: Shared contracts are a primary product principle and a constitution requirement; they reduce drift in status handling, payload parsing, and UI copy.
- **Alternatives considered**:
  - Duplicating status and DTO definitions in mobile and backend. Rejected because it breaks the explicit shared-contract goal of this MVP.
  - Generating all types only from OpenAPI without a shared package. Rejected because the status enum and formatting helpers also need a stable home outside the generated client.

## Decision 6: Use TanStack Query for all network-backed mobile flows with manual refresh plus short polling for in-flight notes

- **Decision**: The mobile app will use TanStack Query for sign-in mutation, note list query, note detail query, note creation mutation, audio upload mutation, and retry mutation. Queries for notes in `uploaded` or `processing` will support manual refresh and optional short polling while the detail screen is focused.
- **Rationale**: This aligns with the constitution, keeps async state handling consistent, and makes loading/error/retry behavior explicit.
- **Alternatives considered**:
  - Custom `useEffect` fetch logic per screen. Rejected because it increases drift and weakens cache/invalidation discipline.
  - Aggressive background polling everywhere. Rejected because manual refresh is sufficient for MVP and easier to reason about in a demo.

## Decision 7: Model processing results and failures as part of the note aggregate, with retry creating a new job attempt

- **Decision**: A note is the user-facing aggregate. Processing attempts live in `ProcessingJob`, but the latest transcript, summary, tags, and user-visible error message are denormalized onto the note for easy list/detail rendering.
- **Rationale**: The app primarily needs the current state, while job history remains available for diagnostics and retry bookkeeping.
- **Alternatives considered**:
  - Storing results only on the job table. Rejected because the list/detail UI would need extra joins and more complicated query contracts.
  - Overwriting the same job attempt on retry. Rejected because keeping attempt history improves observability and debugging.

## Decision 8: Plan Storybook + Chromatic for reusable shared UI states once implementation starts

- **Decision**: The implementation should add Storybook stories for reusable UI surfaces such as `StatusBadge`, `NoteCard`, and `ResultPanel`, and wire them to Chromatic in CI when those components are created.
- **Rationale**: The constitution requires a visual regression path for shared UI, but this repo currently has no UI workspace yet. The plan must still reserve the coverage approach.
- **Alternatives considered**:
  - No visual regression coverage. Rejected because shared UI drift is explicitly governed.
  - Lost Pixel first. Rejected for now because Chromatic aligns more directly with the stated Storybook-first workflow.

## Decision 9: Define regression validation as workspace-scoped TypeScript tests plus backend pytest coverage

- **Decision**: Once scaffolded, the minimum regression suite for this feature is `pnpm vitest` for shared/mobile logic, `uv run pytest --cov=backend --cov-report=term-missing` for backend logic, and API contract validation against `contracts/openapi.yaml`.
- **Rationale**: The highest-risk logic is note status transitions, query behavior, shared DTO handling, and async processing state changes.
- **Alternatives considered**:
  - Manual demo-only verification. Rejected because the constitution requires executable validation.
  - End-to-end tests only. Rejected because lower-layer regression tests are faster and more maintainable for this MVP.

## Decision 10: Publish a Swagger-visible OpenAPI contract for auth, note list/detail, upload, and retry endpoints

- **Decision**: The backend API surface for this MVP includes Swagger-described endpoints for demo login, note list, note detail, note creation, audio upload, and retry.
- **Rationale**: This supports shared contract generation, keeps payload boundaries explicit, and satisfies the constitution's API documentation rule.
- **Alternatives considered**:
  - Deferring API design until implementation. Rejected because shared contracts are a first-order deliverable for this MVP.
  - An undocumented internal-only API. Rejected because the backend is a user-facing product dependency, not a hidden script.
