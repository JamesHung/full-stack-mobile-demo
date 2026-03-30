# Data Model: Mobile Smoke Test Kit

**Feature**: 004-mobile-smoke-kit
**Date**: 2025-07-22

## Entities

### 1. SmokeConfig

The central configuration artifact for a project's smoke test setup. Persisted as `smoke.config.json` in the project root. Validated against a JSON Schema at runtime by `ajv`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `$schema` | string | No | — | JSON Schema reference for editor autocompletion |
| `version` | string | Yes | `"1.0"` | Schema version identifier |
| `appId` | string | Yes | — | App identifier (e.g., `com.demo.voicenotes`). Auto-detected from `app.json` |
| `appRoot` | string | Yes | `"app"` | Relative path to the Expo mobile app directory |
| `backendRoot` | string | No | `"backend"` | Relative path to the backend directory |
| `platforms` | string[] | Yes | `["android", "ios"]` | Supported platforms |
| `services` | ServiceConfig[] | Yes | — | Backend services to start and health-check |
| `metro` | MetroConfig | Yes | — | Metro bundler configuration |
| `flows` | FlowConfig | Yes | — | Maestro flow file configuration |
| `artifacts` | ArtifactConfig | Yes | — | Output artifact path configuration |
| `healthCheck` | HealthCheckDefaults | No | — | Global health check defaults (overridable per service) |

**Relationships**: Contains multiple `ServiceConfig` objects. References `MetroConfig`, `FlowConfig`, `ArtifactConfig`, and `HealthCheckDefaults`.

**Validation rules**:
- `version` must be a supported schema version (currently `"1.0"`)
- `appId` must be a valid Java package name (pattern: `^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$`)
- `appRoot` must be a relative path (no leading `/`)
- `platforms` must contain at least one of `"android"` or `"ios"`
- `services` must have at least one entry when `run` command is used

---

### 2. ServiceConfig

A backend service that the smoke test pipeline starts, health-checks, and cleans up.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | — | Human-readable service name (e.g., `"backend-api"`, `"worker"`) |
| `command` | string | Yes | — | Shell command to start the service |
| `port` | number | Yes | — | TCP port the service listens on |
| `healthPath` | string | No | `"/"` | HTTP path for health check probe (e.g., `"/debug/db-dump"`) |
| `healthTimeout` | number | No | `60` | Seconds to wait for service readiness |
| `retryInterval` | number | No | `2` | Seconds between health check retries |
| `logFile` | string | No | `"{name}.log"` | Log file name (within artifacts log directory) |
| `env` | Record<string, string> | No | `{}` | Additional environment variables for the service process |

**Validation rules**:
- `name` must be unique across all services
- `port` must be 1–65535
- `command` must be a non-empty string
- `healthTimeout` must be > 0
- `retryInterval` must be > 0 and < `healthTimeout`

**State transitions** (runtime):

```
STOPPED → STARTING → RUNNING → HEALTHY → STOPPED
                  ↘ FAILED              ↗
                      UNHEALTHY ────────┘
```

- `STOPPED`: Process not started
- `STARTING`: `spawn()` called, PID assigned
- `RUNNING`: Process alive (PID check passes)
- `HEALTHY`: Port check + HTTP check pass
- `FAILED`: Process exited unexpectedly
- `UNHEALTHY`: Health check timeout expired

---

### 3. MetroConfig

Metro bundler configuration for the mobile app.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `port` | number | Yes | `8081` | Metro bundler port |
| `host` | string | No | `"127.0.0.1"` | Metro bundler host |
| `healthPath` | string | No | `"/status"` | Metro health check endpoint |
| `healthTimeout` | number | No | `60` | Seconds to wait for Metro readiness |

**Validation rules**:
- `port` must be 1–65535
- `host` must be a valid hostname or IP

---

### 4. FlowConfig

Maestro test flow configuration.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `directory` | string | Yes | `".maestro"` | Directory containing Maestro flow files |
| `androidFlow` | string | No | `"android-smoke.yaml"` | Android platform wrapper flow file |
| `iosFlow` | string | No | `"ios-smoke.yaml"` | iOS platform wrapper flow file |
| `canonicalFlow` | string | No | `"canonical-flow.yaml"` | Shared canonical flow file |

**Validation rules**:
- `directory` must be a relative path

---

### 5. ArtifactConfig

Output artifact path configuration.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `outputRoot` | string | Yes | `".artifacts/maestro"` | Root directory for all test output |
| `junitFile` | string | No | `"results.xml"` | JUnit XML filename |
| `summaryFile` | string | No | `"summary.json"` | Run summary filename |

**Validation rules**:
- `outputRoot` must be a relative path

---

### 6. HealthCheckDefaults

Global default health check parameters (overridable per service).

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `timeout` | number | No | `60` | Default timeout in seconds |
| `retryInterval` | number | No | `2` | Default retry interval in seconds |
| `httpMethod` | string | No | `"GET"` | HTTP method for health probes |

---

### 7. SmokeRun (Runtime Entity — Not Persisted in Config)

A single execution of the smoke test pipeline. Tracked in memory during execution; persisted as `summary.json` upon completion.

| Field | Type | Description |
|-------|------|-------------|
| `runId` | string | Unique run identifier (timestamp + random suffix or CI run ID) |
| `platform` | string | Target platform (`"android"` or `"ios"`) |
| `mode` | string | Execution mode (`"local"` or `"ci"`) |
| `startedAt` | string (ISO 8601) | Pipeline start timestamp |
| `completedAt` | string (ISO 8601) | Pipeline completion timestamp |
| `stages` | StageResult[] | Ordered list of stage outcomes |
| `exitCode` | number | Final exit code |
| `artifactPaths` | Record<string, string> | Map of artifact names to file paths |

---

### 8. StageResult (Runtime Entity)

Outcome of a single pipeline stage.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Stage name (`"preflight"`, `"service-startup"`, `"health-check"`, `"test-execution"`, `"cleanup"`) |
| `status` | string | `"passed"`, `"failed"`, `"skipped"` |
| `exitCode` | number | Stage exit code (0 for success) |
| `durationMs` | number | Stage duration in milliseconds |
| `error` | string \| null | Error message if failed |

---

### 9. ErrorSummary (Runtime Entity)

Structured failure report generated when any pipeline stage fails.

| Field | Type | Description |
|-------|------|-------------|
| `stage` | string | Failing stage name |
| `exitCode` | number | Stage exit code |
| `durationMs` | number | Time spent before failure |
| `serviceName` | string \| null | Relevant service (if health check failure) |
| `logTail` | string[] | Last 50 lines of associated log file |
| `renderedText` | string | Pre-formatted terminal output |
| `renderedMarkdown` | string | Pre-formatted GitHub Step Summary markdown |

---

## Entity Relationship Diagram

```
SmokeConfig (smoke.config.json)
├── 1:N  ServiceConfig[]        — services to start/health-check
├── 1:1  MetroConfig            — Metro bundler settings
├── 1:1  FlowConfig             — Maestro flow references
├── 1:1  ArtifactConfig         — output path configuration
└── 1:1  HealthCheckDefaults    — global health check defaults

SmokeRun (runtime)
├── reads  SmokeConfig          — loads config at pipeline start
├── 1:N    StageResult[]        — ordered stage outcomes
├── 0:N    ErrorSummary[]       — generated on stage failure
└── writes summary.json         — persists run summary to disk
```

## JSON Schema Reference

The complete JSON Schema for `smoke.config.json` is defined in `packages/smoke-kit/src/config/schema.ts` and documented in `specs/004-mobile-smoke-kit/contracts/config-schema.md`. The schema serves as the single source of truth (TC-006) for:
1. Runtime validation via `ajv` in the CLI
2. Editor autocompletion via `$schema` reference
3. Scaffold template generation
4. Skill definition documentation
