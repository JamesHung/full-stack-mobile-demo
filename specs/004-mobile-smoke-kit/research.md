# Research: Mobile Smoke Test Kit

**Feature**: 004-mobile-smoke-kit
**Date**: 2025-07-22

## R-001: CLI Framework Selection

**Decision**: Use `commander` for CLI argument parsing.

**Rationale**: `commander` is the de facto standard for Node.js CLIs — mature, zero-config subcommand support, auto-generated help text, built-in type coercion. The kit needs subcommands (`init`, `scaffold`, `preflight`, `run <platform>`) with typed options and clear help output. `commander` provides all of this with a single dependency and no codegen step.

**Alternatives considered**:
- **yargs**: Comparable feature set but heavier API surface. `commander` is simpler for our 4-command structure.
- **citty/unbuild (unjs)**: Lighter but less mature ecosystem. Auto-completion and advanced option handling less proven.
- **Custom `process.argv` parsing**: No dependency, but reinvents subcommand routing, help generation, and validation. Not worth the effort for 4 commands.
- **oclif**: Full CLI framework with plugin system — overkill for a single-purpose tool with 4 commands.

---

## R-002: TypeScript Execution Strategy

**Decision**: Use `tsx` as the TypeScript runner. Expose the CLI via a shell shim that calls `npx tsx src/cli.ts`.

**Rationale**: `tsx` provides zero-config TypeScript execution via esbuild, supporting ESM and CJS without a build step. This avoids maintaining a compilation pipeline for a developer tool that runs locally and in CI. The kit is not a published npm library — it runs from the monorepo, so no pre-compilation is needed for distribution.

**Alternatives considered**:
- **tsc + node**: Requires a build step, `outDir` management, and source map configuration. Adds complexity for a tool that doesn't need AOT compilation.
- **ts-node**: Slower than `tsx` (uses TypeScript's own transpiler). Less compatible with ESM-first codebases.
- **Bun**: Faster runtime but not universally available on CI runners (GitHub Actions Ubuntu images ship Node.js, not Bun). Would add an installation prerequisite.
- **Pre-build with tsup/esbuild**: Viable for distribution but adds build step management. Premature for a monorepo-internal tool.

---

## R-003: JSON Schema Validation Library

**Decision**: Use `ajv` for runtime validation of `smoke.config.json`.

**Rationale**: `ajv` is the standard JSON Schema validator for JavaScript/TypeScript — fastest validator, supports Draft-07 and later, excellent error messages with `ajv-errors`, and TypeScript-native. The JSON Schema serves as the single source of truth for configuration structure (TC-006), consumed by `ajv` at runtime and referenceable by the scaffold skill and documentation.

**Alternatives considered**:
- **Zod**: Excellent TypeScript-first validation but doesn't produce a portable JSON Schema artifact. The spec requires JSON Schema as the shared validation format (TC-006).
- **Zod + zod-to-json-schema**: Would work but adds indirection — define in Zod, convert to JSON Schema. Simpler to author the schema directly and derive TS types.
- **joi**: Mature but no native JSON Schema export. Larger bundle.
- **typebox**: JSON Schema–first with TypeScript type inference. Viable alternative but less ecosystem adoption than `ajv`. Could be revisited if type inference from schema becomes painful.

---

## R-004: Health Check Implementation Strategy

**Decision**: Two-layer health check: TCP port probe (connectivity) + optional HTTP GET (application readiness). Configurable retries, interval, and timeout per service.

**Rationale**: The existing `preflight.sh` uses PID-based liveness (`kill -0`) which only confirms the process exists, not that it's accepting connections. Port-based TCP probing confirms the service is listening. HTTP GET confirms the application layer is ready (e.g., database connections established, routes registered). This two-layer approach matches container orchestration patterns (Kubernetes liveness vs. readiness probes) and is explicitly required by the spec (FR-013).

**Implementation details**:
- **TCP probe**: Use Node.js `net.createConnection()` to attempt a TCP handshake on the configured port. Retry with configurable interval (default 2s) up to timeout (default 60s).
- **HTTP probe**: Use Node.js built-in `fetch()` (available in Node 20+) to GET the configured health endpoint. Accept any 2xx response as healthy. Retry on connection refused, timeout, or 5xx responses.
- **Retry strategy**: Linear interval (not exponential) — health checks are local, not rate-limited. Configurable via `smoke.config.json` per service.

**Alternatives considered**:
- **PID-only monitoring** (current approach): Insufficient — process can exist but not be accepting connections (binding race, crash loop).
- **curl-based probing** (current `smoke_wait_for_http`): Works but shell-dependent. TypeScript implementation provides consistent cross-OS behavior (FR-027).
- **WebSocket-based probing**: Unnecessary complexity for service readiness checks.
- **Third-party health check library (e.g., `wait-on`)**: Adds dependency for simple functionality. TCP + HTTP probes are ~50 lines of code.

---

## R-005: Log Aggregation and Error Summary Format

**Decision**: Read last 50 lines of each relevant log file using reverse file reading. Format as structured Error Summary block with stage name, exit code, and log tail.

**Rationale**: The spec explicitly requires "last 50 lines of relevant logs" (FR-015) formatted as a structured Error Summary. The existing `run-local.sh` already outputs build logs on failure with `--- START BUILD LOG ---` markers. The TS implementation standardizes this across all failure stages and adds structured metadata (stage, exit code, timing).

**Implementation details**:
- **Log tail**: Read file from end using `fs.readFile` + split on newlines + slice last N. For files under 1MB (typical log size), full read + tail is fast enough (<100ms). No streaming/reverse-seek optimization needed.
- **Error Summary format** (terminal):
  ```
  ═══════════════════════════════════════════
  ERROR SUMMARY
  ═══════════════════════════════════════════
  Stage:     health-check
  Exit Code: 3
  Duration:  62.4s
  Service:   backend-api (port 8000)
  ───────────────────────────────────────────
  Last 50 lines of backend-api.log:
  [log content]
  ═══════════════════════════════════════════
  ```
- **Error Summary format** (GitHub Step Summary): Markdown with collapsible `<details>` blocks for log tails.

**Alternatives considered**:
- **Streaming tail (like `tail -f`)**: Unnecessary — we only need the final state after failure, not real-time streaming.
- **Structured JSON error output**: Considered as an additional format, but terminal readability is the primary UX. JSON can be added later if programmatic consumption is needed.
- **Full log upload only**: Insufficient — developers need immediate context without downloading artifacts. Summary + full artifact upload is the right combination.

---

## R-006: Exit Code Strategy

**Decision**: Distinct non-zero exit codes for each failure category, with a clear mapping.

**Rationale**: FR-016 requires distinct exit codes. This enables CI workflows and scripts to branch on failure type (e.g., retry on health check timeout, fail fast on preflight error).

**Exit code mapping**:
| Code | Category | Description |
|------|----------|-------------|
| 0 | Success | All stages completed successfully |
| 1 | General error | Unexpected/unhandled error |
| 2 | Config error | Invalid or missing smoke.config.json |
| 3 | Preflight failure | Missing prerequisites (tools, device, workspace) |
| 4 | Service startup failure | Backend/Metro failed to start |
| 5 | Health check timeout | Service started but not responsive within timeout |
| 6 | Test execution failure | Maestro tests failed |
| 7 | Cleanup failure | Processes could not be terminated (warning only) |

**Alternatives considered**:
- **Single non-zero exit code**: Doesn't meet FR-016.
- **Bash-style signal codes (128+N)**: Conflicts with Node.js signal handling conventions.
- **Custom error objects only**: Exit codes are essential for CI workflow branching.

---

## R-007: Process Management and Cleanup Strategy

**Decision**: Track spawned child processes by PID in a process registry. Register cleanup handler via `process.on('exit')` and `process.on('SIGINT')` / `process.on('SIGTERM')`. Kill processes via `process.kill(pid, 'SIGTERM')` with SIGKILL fallback.

**Rationale**: FR-017 requires graceful cleanup regardless of success/failure. The existing `run-local.sh` uses a trap on EXIT to kill tracked PIDs — the TS version mirrors this with Node.js process signal handlers.

**Implementation details**:
- **Process registry**: Simple array of `{ pid: number, name: string, logFile: string }` objects.
- **Spawn**: Use `child_process.spawn()` with `stdio` configured to pipe to log files.
- **Cleanup order**: SIGTERM each process, wait 5s, SIGKILL any survivors.
- **Orphan prevention**: Use process groups (`detached: true` + `process.kill(-pid)`) to kill entire process trees.

**Alternatives considered**:
- **pm2 / forever**: Full process managers — massive overkill for temporary test infrastructure processes.
- **Docker Compose**: Would work for services but adds Docker as a prerequisite, breaking the portability goal.
- **Leaving cleanup to OS**: Unreliable — CI runners may not clean up orphaned processes between runs.

---

## R-008: App ID Auto-Detection Strategy

**Decision**: Read `app.json` (or `app.config.js` / `app.config.ts`) from the detected app root. Extract `expo.ios.bundleIdentifier` and `expo.android.package`. If both match, use as unified `appId`. If they differ, store both and use the appropriate one per platform.

**Rationale**: FR-002 requires auto-detection. The existing `runtime-config.cjs` hardcodes `com.demo.voicenotes` — the kit must detect this dynamically. SC-008 requires detection from both `app/` and `packages/<name>/` layouts.

**Detection order**:
1. Check for `app.json` in configured/detected app root
2. Parse JSON and extract `expo.ios.bundleIdentifier` and `expo.android.package`
3. If `app.config.js` or `app.config.ts` exists instead, log a warning — static JSON parsing cannot evaluate dynamic configs. Fall back to prompting the user.

**Alternatives considered**:
- **Always prompt user for appId**: Breaks SC-001 (zero manual edits).
- **Parse `app.config.ts` dynamically**: Would require executing arbitrary user code. Security and complexity concern.
- **Read from `eas.json`**: Not all projects use EAS. `app.json` is the universal Expo config.

---

## R-009: Reusable Workflow Template Design

**Decision**: `workflow_call` reusable workflow with typed inputs for platform, backend toggle, artifact upload toggle, and timeout. Consumers call it with ~5-10 lines of YAML.

**Rationale**: FR-022 requires `workflow_call`. SC-006 requires ≤ 10 lines for consumers. The existing `mobile-smoke.yml` is ~150 lines of inline workflow — the reusable version extracts the common logic and exposes only the variation points as inputs.

**Inputs**:
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `platform` | string (enum: android, ios) | required | Target platform |
| `start-backend` | boolean | true | Whether to start backend services |
| `upload-artifacts` | boolean | true | Whether to upload test artifacts |
| `timeout-minutes` | number | 45 | Job timeout |
| `config-path` | string | `smoke.config.json` | Path to config file |

**Alternatives considered**:
- **Composite action**: Can't define jobs or set runner OS — insufficient for platform-specific runners.
- **Template repository**: Doesn't support parameterized invocation.
- **Manual copy/paste of workflow**: Breaks SC-006 and defeats the portability goal.

---

## R-010: Scaffold Template Strategy

**Decision**: Embed template files in `packages/smoke-kit/templates/`. The `scaffold` command copies templates into the target project, performing variable substitution (app ID, paths, ports) via simple string replacement with `{{variable}}` placeholders.

**Rationale**: FR-004/005/006 require template injection. Embedded templates are version-controlled with the kit and guaranteed to be available without network access.

**Template set**:
- `smoke.config.json` — configuration with placeholders
- `scripts/run-smoke.sh` — minimal shim calling `smoke-kit run`
- `flows/android-smoke.yaml` — Maestro Android wrapper
- `flows/ios-smoke.yaml` — Maestro iOS wrapper
- `flows/canonical-flow.yaml` — flow skeleton
- `workflows/smoke.yml` — consumer workflow calling the reusable workflow

**Variable substitution**:
- `{{APP_ID}}` → detected app identifier
- `{{APP_ROOT}}` → relative path to mobile app
- `{{BACKEND_ROOT}}` → relative path to backend
- `{{API_PORT}}` → configured API port (default: 8000)
- `{{METRO_PORT}}` → configured Metro port (default: 8081)

**Alternatives considered**:
- **Handlebars/EJS templates**: Adds template engine dependency for simple string replacement. Overkill.
- **Remote template fetching**: Breaks offline/air-gapped usage.
- **Code generation (AST manipulation)**: Templates are YAML/JSON/shell — no AST needed.
