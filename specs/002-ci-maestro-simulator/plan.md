# Implementation Plan: CI Maestro Simulator Runs

**Branch**: `002-ci-maestro-simulator` | **Date**: 2026-03-23 | **Spec**: [spec.md](/Users/hungming-hung/repo/ai-project/full-stack-demo/specs/002-ci-maestro-simulator/spec.md)
**Input**: Feature specification from `/specs/002-ci-maestro-simulator/spec.md`

## Summary

Add a repo-level mobile smoke workflow that keeps one canonical Maestro journey but makes execution explicit per platform. Local entry points will live at the repo root, auto-start the real backend API and worker, build or install the Expo app for Android emulator or iOS simulator, and emit JUnit plus Maestro evidence. GitHub Actions will add path-filtered Android and iOS smoke jobs that hit the same real backend/worker flow, generate unique per-run note data, and fail hard when a required simulator/emulator cannot be provisioned.

## Technical Context

**Language/Version**: TypeScript 5.x for app and shared surfaces, Python 3.13 for backend and worker surfaces, POSIX shell for orchestration, YAML for Maestro and GitHub Actions definitions  
**Primary Dependencies**: Expo 52, React Native 0.76, Expo Router 4, NativeWind 4, TanStack Query 5, FastAPI, Pydantic v2, `python-dotenv`, Maestro CLI, GitHub Actions  
**Storage**: In-memory mobile auth session, backend SQLite, backend filesystem audio storage, and per-run smoke artifact directories containing JUnit, Maestro output, and debug logs  
**Testing**: `corepack pnpm lint`, `corepack pnpm test`, `corepack pnpm build`, `uv run --directory backend pytest --cov=backend.src --cov-report=term-missing`, `maestro test` on Android emulator and iOS simulator, and `corepack pnpm storybook:build` when reusable note UI changes  
**Target Platform**: Expo-managed Android emulator, Expo-managed iOS simulator, GitHub Actions Linux/macOS runners, FastAPI backend, and background worker  
**Project Type**: Full-stack mobile application with supporting backend, worker, shared package, and CI automation  
**Performance Goals**: Local preflight failures surface within 1 minute, each platform smoke run completes within 15 minutes in CI, and contributors can reach a passing first local smoke run within 20 minutes from a clean checkout  
**Constraints**: Smoke must hit the real backend API and worker, local smoke must auto-start those services, CI must trigger only on smoke-relevant path changes, per-run fixture data must be unique, simulator/emulator provisioning failures must fail the affected job, and app runtime configuration must support platform-aware API base URLs  
**Scale/Scope**: One canonical smoke flow with thin platform-specific wrappers or env files, two repo-level local Make targets, one GitHub Actions workflow with separate Android and iOS jobs, and targeted changes to app runtime config, orchestration scripts, and docs  
**Visual Regression**: Existing Storybook + Chromatic path remains the visual regression baseline; only update note-related stories if smoke stabilization changes reusable components such as `NoteCard` or `ResultPanel`  
**Backend API Docs**: Existing Swagger-visible descriptions for auth and notes endpoints remain mandatory; no new endpoint is planned unless smoke determinism requires a clearly documented support surface

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Result**: PASS

- Expo-managed React Native remains the baseline; this plan only adds simulator/dev-build automation and runtime configurability.
- Backend work stays on Python 3.13 with `uv`, using existing API and worker entry points in `Makefile`.
- Shared contracts remain centralized in `packages/shared`, especially note statuses and DTO boundaries already used by app and backend.
- TypeScript boundaries, Pydantic boundaries, service bootstrap expectations, and smoke-run environment inputs are all explicitly identified.
- Regression scope is explicit: `lint`, `test`, `build`, backend `pytest` regression, Android smoke, iOS smoke, and Storybook build when reusable note UI changes.
- Shared UI stories are only expected to change if reusable note components need selector or copy stabilization.
- NativeWind remains the default styling strategy; no alternate styling layer is introduced.
- TanStack Query continues to own sign-in, list refresh, note detail polling, upload, and retry server-state behavior exercised by the smoke flow.
- Backend configuration remains environment-driven with `.env` loading and no hardcoded secrets in scripts or flow files.
- Backend logging, custom exceptions, and Swagger descriptions remain required for any backend surface touched while stabilizing smoke execution.

**Post-Phase 1 Design Result**: PASS

- Research resolves all execution-policy clarifications from the spec: real backend/worker, local auto-start services, path-filtered CI triggers, run-scoped fixture data, and hard-fail provisioning behavior.
- The data model and contracts separate local orchestration, CI job policy, evidence retention, and run-scoped fixture data without introducing stack or governance exceptions.
- Quickstart and contract outputs align with the constitution by preserving repo-level workflows, typed/shared boundaries, and the full regression gate.

## Project Structure

### Documentation (this feature)

```text
specs/002-ci-maestro-simulator/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── ci-smoke-workflow.md
│   └── local-smoke-command.md
└── tasks.md
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── mobile-smoke.yml              # Planned workflow with Android/iOS split jobs

.maestro/
├── voice-notes-smoke.yaml            # Canonical smoke journey
├── android-smoke.yaml                # Planned Android wrapper or env entry
└── ios-smoke.yaml                    # Planned iOS wrapper or env entry

scripts/
└── maestro/
    ├── preflight.sh                  # Planned prerequisite checks
    ├── run-local.sh                  # Planned local auto-start + Maestro runner
    └── run-ci.sh                     # Planned CI wrapper for artifact emission

Makefile                              # Public repo-level smoke entry points
README.md                             # Developer workflow documentation
package.json
pnpm-lock.yaml
pnpm-workspace.yaml

app/
├── app.json                          # Bundle/package identifiers for Maestro appId parity
├── ios/                              # Existing native iOS project used by Expo run path
├── app/
│   ├── sign-in.tsx
│   ├── (tabs)/index.tsx
│   └── notes/
│       ├── create.tsx
│       └── [noteId].tsx
├── features/
│   ├── auth/session.ts
│   └── notes/
│       ├── api/createNote.ts
│       ├── queries/
│       ├── hooks/
│       └── components/
└── lib/api/client.ts                 # Planned API base URL override support

backend/
├── pyproject.toml
├── uv.lock
├── src/
│   ├── api/
│   ├── exceptions/
│   ├── logging/
│   ├── models/
│   ├── services/
│   ├── settings/
│   └── workers/
└── tests/

packages/
└── shared/
    └── src/
        ├── contracts/
        ├── validation/
        └── formatters/

tests/
├── integration/
├── unit/
└── mocks/

.storybook/
└── main.ts
```

**Structure Decision**: Keep the existing app, backend, shared package, and test layout. Add smoke-specific orchestration at the repo root through `.github/workflows/`, `.maestro/`, `scripts/maestro/`, and `Makefile`, while limiting code changes to runtime config, selector stability, and service orchestration support needed to keep the smoke journey deterministic.

## Complexity Tracking

No constitution violations or exception-driven complexity are currently required.
