<!--
Sync Impact Report
- Version change: 1.2.0 -> 1.3.0
- Modified principles:
  - I. Cross-Platform Delivery Baseline -> I. Full-Stack Delivery Baseline
  - II. Shared Logic Contract Integrity -> II. Shared Contract Integrity
  - III. Continuous Validation Gate -> III. Continuous Validation Gate
  - V. TanStack Query Server State Discipline -> V. Service and Server-State Discipline
- Added sections:
  - None
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated /.specify/templates/plan-template.md
  - ✅ updated /.specify/templates/spec-template.md
  - ✅ updated /.specify/templates/tasks-template.md
  - ⚠ pending /.specify/templates/commands/ (directory absent; no command docs to update)
  - ✅ updated /AGENTS.md
- Follow-up TODOs:
  - None
-->
# Full Stack Demo Constitution

## Core Principles

### I. Full-Stack Delivery Baseline
All new client-facing product work MUST preserve the Expo-managed React Native
with TypeScript baseline for mobile and MUST pair any server surface with
Python 3.13. Feature plans MUST state whether work affects mobile only, mobile
plus backend, or a broader full-stack surface, and MUST justify any divergence
that reduces code sharing or delivery consistency. Backend dependencies and
execution workflows MUST use `uv`; introducing a different Python runtime or
package manager requires an explicit exception in the implementation plan.
Rationale: a small number of approved runtimes keeps delivery, onboarding, and
operations predictable.

### II. Shared Contract Integrity
Validation rules, formatting logic, and shared types MUST be abstracted into
reusable modules whenever the same behavior is required across clients and
services. TypeScript clients MUST keep strict, explicit types at module
boundaries, and Python backends MUST use Pydantic models for request,
response, configuration, and domain validation where structured data crosses a
boundary. `any`, implicit data coercion, duplicate cross-platform business
logic, and untyped API payload handling MUST NOT be introduced without a
documented justification in the implementation plan. Rationale: shared,
validated contracts reduce drift, duplicate bugs, and review cost.

### III. Continuous Validation Gate
Every feature MUST define executable validation before it is considered
complete. Frontend and shared TypeScript changes MUST use Vitest at the lowest
practical layer, and backend Python changes MUST use `pytest` with a maintained
coverage threshold above 80 percent for the affected backend package or
service. Tests MUST cover the highest-risk logic, such as shared helpers,
hooks, query adapters, API contracts, state transitions, formatting, pure
domain modules, exception paths, and security-sensitive configuration loading;
manual-only validation is insufficient unless platform constraints are
documented and approved. Before finalizing any implementation, AI MUST run the
available automated test suite that exercises the changed surface to verify no
existing logic regressed. Bug fixes MUST add or update a regression test when
the affected behavior can be isolated. If a change materially affects shared UI
components, component variants, or reusable screens, the project MUST define a
CI visual regression path through Storybook plus Chromatic or a maintained
equivalent such as Lost Pixel. This rule keeps the project fast without trading
away repeatability.

### IV. Cross-Platform UI Consistency
React Native styling MUST use NativeWind as the default styling layer for new
screen and component work. Visual consistency MUST be maintained across web and
mobile by reusing shared design tokens, component variants, copy patterns, and
interaction states while still respecting platform-native layout and
interaction conventions. When NativeWind or platform primitives cannot express
a requirement, the exception MUST be localized and documented in the spec or
plan. Shared UI intended for reuse across platforms MUST have story coverage
that captures its supported states so visual regression tooling can detect UI
drift. Rationale: a single visual system reduces UI drift without forcing
unnatural cross-platform behavior.

### V. Service and Server-State Discipline
Remote data fetching, caching, mutation, retry, and invalidation on the client
MUST be implemented through TanStack Query for all network-backed features.
Backend services MUST centralize structured logging, define custom exception
classes for domain and transport failures, and MUST NOT hardcode credentials or
secrets in source files. Runtime secrets MUST load from environment variables,
with local development using `.env` files through `python-dotenv` or a stricter
equivalent. Every backend endpoint MUST publish a Swagger-visible description.
Components MUST NOT manage server state with bespoke `useEffect` fetch chains
when a query or mutation abstraction is appropriate. Query keys, loading
states, error states, cache invalidation behavior, logging strategy, exception
mapping, and secret-loading approach MUST be specified during planning.
Rationale: standardized server-state and service conventions improve
predictability, debuggability, and security reviewability.

## Platform Constraints

The baseline application stack is Expo + React Native + TypeScript + Vitest +
NativeWind + TanStack Query for client surfaces, and Python 3.13 + `uv` +
Pydantic + `pytest` + `python-dotenv` for backend surfaces. Python code MUST
follow PEP 8. Shared logic modules SHOULD be authored once and consumed across
web, mobile, and backend layers whenever the behavior is materially identical.
New proposals MUST explain any deviation from this stack or from shared-module
reuse, and MUST identify migration cost, lost developer-efficiency benefits,
and any new operational burden.

Feature specifications MUST identify:

- target platforms affected: iOS, Android, or both
- whether backend services, workers, or APIs are in scope
- whether a related web surface is also affected and what code can be shared
- network dependency and offline expectations
- loading, empty, error, and retry behavior for each TanStack Query-backed flow
- backend runtime selection, dependency workflow, and configuration sources
- Pydantic models that define backend request, response, settings, and domain
  validation boundaries
- centralized logging and custom exception handling strategy for backend work
- Swagger descriptions required for new or changed backend endpoints
- how secrets and local development configuration are sourced without hardcoded
  credentials
- backend `pytest` suites to run and the coverage target they must satisfy
- shared validation, formatting, and type modules touched or introduced
- whether shared UI stories or visual regression baselines must be added or updated
- whether work introduces shared UI primitives, shared hooks, or shared query
  clients that require broader regression coverage

## Delivery Workflow

Implementation plans MUST include a Constitution Check that verifies stack
compliance, typed boundary coverage, shared-logic extraction decisions,
frontend Vitest scope, backend `pytest` scope, NativeWind styling strategy,
TanStack Query ownership of server state, secret management, centralized
logging, custom exceptions, and Swagger documentation coverage. Tasks MUST keep
setup, foundational query/configuration work, backend service concerns, and
per-user-story validation explicit.

Before merge, reviewers MUST confirm:

- the chosen stack still matches Expo-managed React Native expectations and any
  affected web surface has an explicit consistency plan
- backend work uses Python 3.13 with `uv`, follows PEP 8, and documents any
  approved exception
- new or changed shared logic is extracted when reuse is warranted, and new
  interfaces are typed and reviewable
- Pydantic models define backend validation boundaries for structured payloads
  and settings
- Vitest coverage exists for changed frontend or shared behavior, and `pytest`
  coverage above 80 percent exists for changed backend behavior, or a justified
  exception is recorded
- the available automated regression suite was run before finalization, or a
  documented blocker exists
- visual regression coverage exists for changed shared UI, or a justified
  exception and follow-up plan is recorded
- UI changes use NativeWind by default and preserve cross-platform visual
  consistency without violating native platform expectations
- remote data flows use TanStack Query with explicit invalidation behavior
- backend secrets are loaded from environment variables or `.env` files without
  hardcoded credentials
- backend logging and custom exception handling are centralized and every
  changed endpoint has a Swagger-visible description

## Governance

This constitution overrides conflicting local habits, template wording, and
feature-level preferences. Amendments MUST be made in
`/.specify/memory/constitution.md`, include a Sync Impact Report, and update all
affected templates or runtime guidance within the same change.

Versioning policy follows semantic versioning for governance:

- MAJOR: removal or redefinition of a core principle in a backward-incompatible
  way
- MINOR: addition of a new principle, mandatory section, or materially expanded
  governance requirement
- PATCH: clarifications, wording improvements, and non-semantic refinements

Compliance review is mandatory for every plan, spec, task list, and pull
request. Any exception MUST document scope, rationale, approval owner, and an
expiration or follow-up plan before implementation begins.

**Version**: 1.3.0 | **Ratified**: 2026-03-20 | **Last Amended**: 2026-03-23
