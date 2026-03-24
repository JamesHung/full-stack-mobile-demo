---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Vitest coverage is REQUIRED for changed frontend/shared behavior. Backend changes REQUIRE `pytest` coverage with a target above 80 percent for the affected backend package or service.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app**: `backend/src/`, `frontend/src/`
- **Expo mobile app**: `app/`, `components/`, `features/`, `hooks/`, `providers/`, `tests/`
- Paths shown below must be adjusted to the structure selected in plan.md

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize Expo + React Native + TypeScript dependencies required by the plan
- [ ] T003 [P] Configure Vitest, NativeWind, shared logic packaging, and developer tooling
- [ ] T003A [P] Configure Storybook and CI visual regression tooling for shared UI when required
- [ ] T003B [P] Initialize Python 3.13 backend tooling with `uv`, `pytest`, `python-dotenv`, and Pydantic when server work is in scope

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup database schema and migrations framework
- [ ] T005 [P] Implement authentication/authorization framework
- [ ] T006 [P] Setup API routing and middleware structure
- [ ] T007 Create base models/entities that all stories depend on
- [ ] T007A [P] Extract shared validation, formatting, and type modules for web/mobile/backend reuse
- [ ] T008 Configure TanStack Query provider, query client defaults, and error handling
- [ ] T009 Setup environment and platform configuration management
- [ ] T009A [P] Implement backend settings loading from environment variables and `.env` without hardcoded credentials
- [ ] T009B [P] Establish centralized backend logging and custom exception modules
- [ ] T009C [P] Define Swagger/OpenAPI descriptions for shared or foundational endpoints

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 ⚠️

> **NOTE: Define these tests before implementation and confirm they fail or are absent for the target behavior**

- [ ] T010 [P] [US1] Add Vitest coverage for [hook/query/helper] in tests/unit/[name].test.ts
- [ ] T011 [P] [US1] Add integration-style validation for [user journey] in tests/integration/[name].test.ts
- [ ] T011A [P] [US1] Add `pytest` coverage for backend [endpoint/service] in backend/tests/[name].py and track coverage toward >80%

### Implementation for User Story 1

- [ ] T012 [P] [US1] Create or update typed models/hooks in app/features/[feature]/[file].ts
- [ ] T012A [P] [US1] Extract reusable logic into packages/shared/[file].ts when behavior is shared across web and mobile
- [ ] T012B [P] [US1] Create or update Pydantic models in backend/src/models/[file].py for request, response, and settings validation
- [ ] T013 [P] [US1] Build NativeWind-based UI in app/features/[feature]/[file].tsx
- [ ] T013A [P] [US1] Add or update Storybook stories for shared UI states in .storybook/ or the agreed stories directory
- [ ] T014 [US1] Implement TanStack Query integration in app/features/[feature]/queries/[file].ts
- [ ] T014A [US1] Implement backend endpoint/service in backend/src/api/[file].py or backend/src/services/[file].py with Swagger description
- [ ] T015 [US1] Wire screen or component flow in app/[location]/[file].tsx
- [ ] T016 [US1] Add loading, empty, error, and retry states
- [ ] T017 [US1] Verify query invalidation, optimistic/update behavior, and cross-platform UI consistency if mutations exist
- [ ] T017A [US1] Route backend failures through centralized custom exceptions and structured logging

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 ⚠️

- [ ] T018 [P] [US2] Add Vitest coverage for [hook/query/helper] in tests/unit/[name].test.ts
- [ ] T019 [P] [US2] Add integration-style validation for [user journey] in tests/integration/[name].test.ts
- [ ] T019A [P] [US2] Add `pytest` coverage for backend [endpoint/service] in backend/tests/[name].py and track coverage toward >80%

### Implementation for User Story 2

- [ ] T020 [P] [US2] Create or update typed models/hooks in app/features/[feature]/[file].ts
- [ ] T020A [P] [US2] Extract reusable logic into packages/shared/[file].ts when behavior is shared across web and mobile
- [ ] T020B [P] [US2] Create or update Pydantic models in backend/src/models/[file].py for request, response, and settings validation
- [ ] T021 [US2] Implement NativeWind UI and state bindings in app/features/[feature]/[file].tsx
- [ ] T021A [P] [US2] Add or update Storybook stories for shared UI states in .storybook/ or the agreed stories directory
- [ ] T022 [US2] Implement TanStack Query-backed behavior in app/features/[feature]/queries/[file].ts
- [ ] T022A [US2] Implement backend endpoint/service in backend/src/api/[file].py or backend/src/services/[file].py with Swagger description
- [ ] T023 [US2] Integrate with User Story 1 components or providers if needed
- [ ] T023A [US2] Route backend failures through centralized custom exceptions and structured logging

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] Add Vitest coverage for [hook/query/helper] in tests/unit/[name].test.ts
- [ ] T025 [P] [US3] Add integration-style validation for [user journey] in tests/integration/[name].test.ts
- [ ] T025A [P] [US3] Add `pytest` coverage for backend [endpoint/service] in backend/tests/[name].py and track coverage toward >80%

### Implementation for User Story 3

- [ ] T026 [P] [US3] Create or update typed models/hooks in app/features/[feature]/[file].ts
- [ ] T026A [P] [US3] Extract reusable logic into packages/shared/[file].ts when behavior is shared across web and mobile
- [ ] T026B [P] [US3] Create or update Pydantic models in backend/src/models/[file].py for request, response, and settings validation
- [ ] T027 [US3] Implement NativeWind UI and state bindings in app/features/[feature]/[file].tsx
- [ ] T027A [P] [US3] Add or update Storybook stories for shared UI states in .storybook/ or the agreed stories directory
- [ ] T028 [US3] Implement TanStack Query-backed behavior in app/features/[feature]/queries/[file].ts
- [ ] T028A [US3] Implement backend endpoint/service in backend/src/api/[file].py or backend/src/services/[file].py with Swagger description
- [ ] T028B [US3] Route backend failures through centralized custom exceptions and structured logging

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation and quickstart updates for Expo workflows
- [ ] TXXX [P] Documentation and quickstart updates for backend `uv` workflows and environment setup
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional Vitest coverage in tests/unit/
- [ ] TXXX [P] Additional `pytest` coverage and coverage-report verification for backend packages
- [ ] TXXX Update visual regression baselines or approve visual diffs in the chosen CI service
- [ ] TXXX Run the named automated regression suite before finalizing implementation
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Vitest coverage and required backend `pytest` coverage MUST be defined before implementation begins
- Shared reusable logic before platform-specific composition when the behavior is common across web, mobile, and backend
- Shared UI stories before final visual regression approval when reusable UI changes
- Typed models/hooks and Pydantic contracts before query adapters or backend endpoint wiring
- Query adapters before screen integration
- Environment/configuration, centralized logging, and custom exceptions before backend endpoint completion
- Core implementation before broader integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Vitest coverage for [hook/query/helper] in tests/unit/[name].test.ts"
Task: "Integration-style validation for [user journey] in tests/integration/[name].test.ts"

# Launch all models for User Story 1 together:
Task: "Create typed hook or model in app/features/[feature]/[file].ts"
Task: "Build NativeWind UI in app/features/[feature]/[file].tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify Vitest coverage exists for changed behavior before implementing
- Verify required backend `pytest` coverage and Swagger descriptions exist for changed backend behavior before implementing
- Run the named automated regression suite before finalizing implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
