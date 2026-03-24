# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [TypeScript for client surfaces; Python 3.13 for backend surfaces; note exact scope or NEEDS CLARIFICATION]
**Primary Dependencies**: [React Native, Expo, NativeWind, TanStack Query, Pydantic, python-dotenv, shared logic packages/modules, or approved exception]
**Storage**: [if applicable, e.g., AsyncStorage, secure storage, backend API, Postgres, files, or N/A]
**Testing**: [Vitest mandatory for changed frontend/shared behavior; pytest mandatory for backend changes with >80% coverage target]
**Target Platform**: [iOS, Android, backend service, or combined scope - specify minimum support if relevant]
**Project Type**: [mobile-app by default; justify any additional service, worker, API, or web surface]
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]
**Visual Regression**: [Storybook + Chromatic, Lost Pixel, or NEEDS CLARIFICATION]
**Backend API Docs**: [Swagger/OpenAPI description coverage for each endpoint, or N/A]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Expo-managed React Native remains the baseline; any deviation is explicitly justified.
- Python backend work uses Python 3.13 with `uv`, or the deviation is explicitly justified.
- Shared validation, formatting, and type modules are identified, along with any justified duplication across web, mobile, and backend.
- TypeScript boundaries, Pydantic boundaries, payload types, and shared contracts are identified.
- Vitest coverage for changed frontend/shared behavior and `pytest` coverage above 80% for changed backend behavior are listed, including the regression suite to run before finalization.
- Shared UI changes identify required stories and the visual regression check that CI will run.
- NativeWind is the default styling strategy for new UI work; cross-platform consistency and exceptions are documented.
- TanStack Query owns all server-state flows, with query keys and invalidation behavior identified.
- Backend configuration uses environment variables and `.env` loading without hardcoded credentials.
- Backend logging, custom exceptions, and Swagger-visible endpoint descriptions are planned explicitly.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── api/
│   ├── exceptions/
│   ├── logging/
│   ├── services/
│   ├── settings/
│   └── models/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── adapters/
└── tests/

# Option 3: Expo mobile app (default)
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

backend/ or api/  # Only if the feature explicitly includes a server surface
├── src/
│   ├── api/
│   ├── exceptions/
│   ├── logging/
│   ├── models/
│   ├── services/
│   └── settings/
└── tests/

packages/
└── shared/  # validation, formatting, types, and other reusable cross-platform logic

.storybook/
└── [Storybook config for visual regression if UI stories are required]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
