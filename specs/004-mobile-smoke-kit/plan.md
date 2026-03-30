# Implementation Plan: Mobile Smoke Test Kit

**Branch**: `004-mobile-smoke-kit` | **Date**: 2025-07-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-mobile-smoke-kit/spec.md`

## Summary

Productize the existing `scripts/maestro/` smoke test infrastructure (runtime-config.cjs, preflight.sh, run-local.sh, mobile-smoke.yml) into a portable, reusable **Smoke Kit** package (`packages/smoke-kit/`). The kit exposes a TypeScript CLI (`smoke-kit`) with `init`, `scaffold`, `preflight`, and `run` commands. It uses JSON Schema–validated configuration (`smoke.config.json`), port-based TCP/HTTP health checks (replacing PID monitoring), structured error summaries with log tail aggregation, and a reusable GitHub Actions workflow template. A Codex skill definition (`skills/mobile-smoke-scaffold/SKILL.md`) enables AI agents to scaffold smoke tests autonomously.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js ≥ 20) — CLI and all core logic. No Python code is added or modified by this feature.
**Primary Dependencies**: `ajv` (JSON Schema validation), `tsx` (TypeScript execution without compilation), `commander` (CLI argument parsing). No Expo, React Native, NativeWind, TanStack Query, or Pydantic dependencies — the kit is self-contained and portable.
**Storage**: Filesystem only — reads/writes `smoke.config.json`, log files, JUnit XML artifacts. No database, API, or cloud storage.
**Testing**: Vitest for all CLI unit tests (config parsing, health check logic, log aggregation, error summary formatting). Target ≥ 80% line coverage on `packages/smoke-kit/src/`. No pytest — no Python code changed.
**Target Platform**: macOS and Linux (CLI tool). Orchestrates iOS and Android smoke tests but is itself platform-agnostic Node.js.
**Project Type**: Monorepo package (developer tooling). Not a mobile app, not a backend service. Justified deviation: this is a build/test infrastructure package.
**Performance Goals**: Health check probes must complete within configured timeout (default 60s). CLI startup < 500ms. Log tail extraction < 100ms for typical log files.
**Constraints**: Zero runtime dependencies on existing app/ or backend/ code. Must work in any Expo + backend monorepo, not just this one.
**Scale/Scope**: Targets repositories with 1–5 backend services, 1 mobile app, standard Maestro flow structure.
**Visual Regression**: N/A — no UI components.
**Backend API Docs**: N/A — no backend endpoints added or modified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- ✅ **Expo-managed RN baseline**: Not applicable. This feature does not add or modify mobile app screens. The kit *orchestrates* Expo apps but does not alter them.
- ✅ **Python 3.13 with `uv`**: Not applicable. No Python code is added or modified. The kit starts existing Python services via configured shell commands.
- ✅ **Shared validation modules**: The JSON Schema for `smoke.config.json` is the shared validation artifact (TC-006). It is consumed by the CLI (`ajv`) and referenced by the scaffold skill. No cross-language duplication — schema is language-neutral.
- ✅ **TypeScript boundaries**: All module boundaries use explicit TypeScript interfaces. Config types are derived from the JSON Schema. No `any` types.
- ✅ **Vitest coverage**: Vitest covers config parsing, health check logic, log aggregation, and error summary formatting (TC-004, TC-008). Target ≥ 80% on `packages/smoke-kit/src/`. Regression suite: `pnpm vitest run --project smoke-kit`.
- ✅ **Shared UI / visual regression**: Not applicable — no UI components.
- ✅ **NativeWind**: Not applicable — no UI work.
- ✅ **TanStack Query**: Not applicable — no server-state client code.
- ✅ **Backend configuration**: Not applicable — no backend code changed. The kit reads service config from `smoke.config.json`, not from env vars or hardcoded values.
- ✅ **Backend logging/exceptions/Swagger**: Not applicable — no backend endpoints.
- ✅ **FR-027 compliance**: Core CLI logic is TypeScript. Shell scripts limited to minimal entry-point shims.

## Project Structure

### Documentation (this feature)

```text
specs/004-mobile-smoke-kit/
├── plan.md              # This file
├── research.md          # Phase 0: technical decisions and rationale
├── data-model.md        # Phase 1: entity definitions and schemas
├── quickstart.md        # Phase 1: developer getting-started guide
├── contracts/           # Phase 1: CLI interface contracts
│   ├── cli-commands.md  # Command signatures, flags, exit codes
│   └── config-schema.md # smoke.config.json JSON Schema reference
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/smoke-kit/
├── package.json              # Package manifest with "bin": { "smoke-kit": "./bin/smoke-kit.sh" }
├── tsconfig.json             # TypeScript config extending tsconfig.base.json
├── bin/
│   └── smoke-kit.sh          # Minimal shell shim: exec tsx src/cli.ts "$@"
├── src/
│   ├── cli.ts                # Commander-based CLI entry point
│   ├── commands/
│   │   ├── init.ts           # smoke-kit init — detect project, generate config
│   │   ├── scaffold.ts       # smoke-kit scaffold — inject templates into project
│   │   ├── preflight.ts      # smoke-kit preflight — validate prerequisites
│   │   └── run.ts            # smoke-kit run <platform> — full pipeline orchestration
│   ├── config/
│   │   ├── schema.ts         # JSON Schema definition (exported for reuse)
│   │   ├── loader.ts         # Load + validate smoke.config.json via ajv
│   │   └── types.ts          # TypeScript types derived from schema
│   ├── health/
│   │   ├── tcp-probe.ts      # TCP port connectivity check
│   │   └── http-probe.ts     # HTTP GET with retry logic
│   ├── logs/
│   │   ├── tail.ts           # Read last N lines from log file
│   │   └── error-summary.ts  # Format structured Error Summary block
│   ├── orchestrator/
│   │   ├── pipeline.ts       # Stage-based pipeline executor
│   │   ├── service-manager.ts # Start/stop/track background processes
│   │   └── cleanup.ts        # Graceful process cleanup on exit
│   ├── output/
│   │   ├── junit.ts          # JUnit XML path management
│   │   └── summary.ts        # Run summary file generation
│   └── utils/
│       ├── detect-app.ts     # Auto-detect appId from app.json/app.config.js
│       ├── platform.ts       # Platform-specific defaults (android/ios)
│       └── exit-codes.ts     # Distinct exit code constants
├── templates/
│   ├── smoke.config.json     # Template config for scaffold
│   ├── scripts/
│   │   └── run-smoke.sh      # Minimal shell shim template
│   ├── flows/
│   │   ├── android-smoke.yaml # Maestro platform wrapper (Android)
│   │   ├── ios-smoke.yaml     # Maestro platform wrapper (iOS)
│   │   └── canonical-flow.yaml # Canonical flow skeleton
│   └── workflows/
│       └── smoke.yml          # GitHub Actions workflow template
└── __tests__/
    ├── config/
    │   ├── loader.test.ts     # Config loading and validation
    │   └── schema.test.ts     # Schema edge cases
    ├── health/
    │   ├── tcp-probe.test.ts  # TCP probe logic
    │   └── http-probe.test.ts # HTTP probe with retries
    ├── logs/
    │   ├── tail.test.ts       # Log tail extraction
    │   └── error-summary.test.ts # Error summary formatting
    ├── commands/
    │   ├── init.test.ts       # Init command behavior
    │   └── preflight.test.ts  # Preflight validation
    └── utils/
        └── detect-app.test.ts # App ID auto-detection

skills/mobile-smoke-scaffold/
├── SKILL.md                   # AI agent skill definition
└── references/
    └── config-reference.md    # smoke.config.json field reference

.github/workflows/
└── smoke-kit-reusable.yml     # Reusable workflow_call workflow
```

**Structure Decision**: New monorepo package at `packages/smoke-kit/` — consistent with existing `packages/*` workspace convention. Self-contained with no imports from `app/`, `backend/`, or `packages/shared/`. Tests co-located in `__tests__/` within the package (mirrors source structure for discoverability).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| No Python / no Pydantic | Kit is pure TypeScript tooling; JSON Schema replaces Pydantic for config validation | Python would add runtime dependency and break portability goal |
| No TanStack Query | Kit is a CLI tool, not a client-side data-fetching surface | N/A — no server-state management needed |
| No NativeWind / UI | Kit is infrastructure tooling with terminal output only | N/A — no visual interface |
| New package (`packages/smoke-kit/`) | Portable kit must not depend on app-specific code | Extending `packages/shared/` rejected: different consumers, different concerns |
