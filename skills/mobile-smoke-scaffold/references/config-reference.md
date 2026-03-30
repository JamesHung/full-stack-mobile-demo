# smoke.config.json Reference

Canonical types: [`packages/smoke-kit/src/config/types.ts`][types-src]

---

## Top-level Fields (`SmokeConfig`)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `$schema` | `string` | No | — | Optional JSON Schema URL for editor validation. |
| `version` | `string` | **Yes** | — | Config schema version (e.g. `"1"`). |
| `appId` | `string` | **Yes** | — | Application identifier. Must match `expo.android.package` / `expo.ios.bundleIdentifier` in `app.json`. |
| `appRoot` | `string` | **Yes** | `"."` | Relative path from repo root to the Expo / React Native app directory. |
| `backendRoot` | `string` | No | — | Relative path from repo root to the backend directory. Used to resolve service `cwd` defaults. |
| `platforms` | `("android" \| "ios")[]` | **Yes** | `["android"]` | Target platforms for smoke runs. |
| `services` | `ServiceConfig[]` | **Yes** | `[]` | Backend and auxiliary services to start before smoke flows. |
| `metro` | `MetroConfig` | **Yes** | — | Metro bundler configuration for the app under test. |
| `flows` | `FlowConfig` | **Yes** | — | Maestro flow file locations. |
| `artifacts` | `ArtifactConfig` | **Yes** | — | Output paths for test results and artifacts. |
| `healthCheck` | `HealthCheckDefaults` | No | — | Global health check defaults applied to all services unless overridden. |

---

## `ServiceConfig`

Defines a backend or auxiliary service that must be running before Maestro flows execute.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | **Yes** | — | Human-readable service name (e.g. `"backend"`, `"auth-service"`). Used in logs and error reports. |
| `command` | `string` | **Yes** | — | Shell command to start the service (e.g. `"uv run uvicorn main:app"`). |
| `port` | `number` | **Yes** | — | TCP port the service listens on. Used for health checks. |
| `healthPath` | `string` | No | — | HTTP path for health check (e.g. `"/health"`). When set, health checks use HTTP instead of TCP. |
| `healthTimeout` | `number` | No | `30000` | Maximum time in ms to wait for the service to become healthy. |
| `retryInterval` | `number` | No | `1000` | Interval in ms between health check retries. |
| `logFile` | `string` | No | — | Path to write service stdout/stderr. Relative to `artifacts.outputRoot`. |
| `env` | `Record<string, string>` | No | `{}` | Additional environment variables passed to the service process. |

---

## `MetroConfig`

Metro bundler settings for the React Native / Expo app under test.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `port` | `number` | **Yes** | `8081` | Port Metro listens on. |
| `host` | `string` | No | `"localhost"` | Host Metro binds to. |
| `healthPath` | `string` | No | `"/status"` | HTTP path to check Metro readiness. |
| `healthTimeout` | `number` | No | `60000` | Maximum time in ms to wait for Metro to become ready. |

---

## `FlowConfig`

Locations of Maestro flow YAML files.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `directory` | `string` | **Yes** | `"maestro"` | Directory containing Maestro flow files, relative to repo root. |
| `androidFlow` | `string` | No | — | Path to the Android-specific entry flow file. Relative to `directory`. |
| `iosFlow` | `string` | No | — | Path to the iOS-specific entry flow file. Relative to `directory`. |
| `canonicalFlow` | `string` | No | — | Path to a platform-agnostic entry flow. Used when no platform-specific flow is defined. |

---

## `ArtifactConfig`

Output paths for smoke run results.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `outputRoot` | `string` | **Yes** | `"smoke-artifacts"` | Root directory for all smoke run output, relative to repo root. |
| `junitFile` | `string` | No | `"junit.xml"` | JUnit XML report filename, relative to `outputRoot`. |
| `summaryFile` | `string` | No | `"summary.json"` | JSON summary filename, relative to `outputRoot`. |

---

## `HealthCheckDefaults`

Global defaults for service health checks. Individual `ServiceConfig` fields override these.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `timeout` | `number` | No | `30000` | Default health check timeout in ms. |
| `retryInterval` | `number` | No | `1000` | Default retry interval in ms. |
| `httpMethod` | `"GET" \| "HEAD"` | No | `"GET"` | HTTP method used for HTTP health checks. |

---

## Example Configs

### Monorepo with `app/` subdirectory

```json
{
  "version": "1",
  "appId": "com.example.myapp",
  "appRoot": "app",
  "backendRoot": "backend",
  "platforms": ["android", "ios"],
  "services": [
    {
      "name": "backend",
      "command": "uv run uvicorn main:app --host 0.0.0.0 --port 8000",
      "port": 8000,
      "healthPath": "/health",
      "healthTimeout": 30000,
      "env": {
        "DATABASE_URL": "sqlite:///./test.db"
      }
    }
  ],
  "metro": {
    "port": 8081,
    "healthPath": "/status",
    "healthTimeout": 60000
  },
  "flows": {
    "directory": "maestro",
    "androidFlow": "smoke-android.yaml",
    "iosFlow": "smoke-ios.yaml"
  },
  "artifacts": {
    "outputRoot": "smoke-artifacts",
    "junitFile": "junit.xml",
    "summaryFile": "summary.json"
  },
  "healthCheck": {
    "timeout": 30000,
    "retryInterval": 1000,
    "httpMethod": "GET"
  }
}
```

### Standalone project (app at repo root)

```json
{
  "version": "1",
  "appId": "com.standalone.app",
  "appRoot": ".",
  "platforms": ["android"],
  "services": [
    {
      "name": "api",
      "command": "node server.js",
      "port": 3000,
      "healthPath": "/api/health"
    }
  ],
  "metro": {
    "port": 8081
  },
  "flows": {
    "directory": "maestro",
    "canonicalFlow": "smoke.yaml"
  },
  "artifacts": {
    "outputRoot": "smoke-artifacts"
  }
}
```

### Multiple services with custom health checks

```json
{
  "version": "1",
  "appId": "com.example.multiservice",
  "appRoot": "app",
  "backendRoot": "services",
  "platforms": ["android", "ios"],
  "services": [
    {
      "name": "api-gateway",
      "command": "node dist/gateway.js",
      "port": 4000,
      "healthPath": "/healthz",
      "healthTimeout": 15000,
      "retryInterval": 500,
      "logFile": "gateway.log"
    },
    {
      "name": "auth-service",
      "command": "uv run uvicorn auth.main:app --port 4001",
      "port": 4001,
      "healthPath": "/health",
      "healthTimeout": 20000,
      "env": {
        "JWT_SECRET": "test-secret",
        "DATABASE_URL": "sqlite:///./auth-test.db"
      }
    },
    {
      "name": "worker",
      "command": "node dist/worker.js",
      "port": 4002,
      "healthTimeout": 45000,
      "retryInterval": 2000,
      "logFile": "worker.log"
    }
  ],
  "metro": {
    "port": 8081,
    "healthPath": "/status",
    "healthTimeout": 90000
  },
  "flows": {
    "directory": "maestro",
    "androidFlow": "smoke-android.yaml",
    "iosFlow": "smoke-ios.yaml"
  },
  "artifacts": {
    "outputRoot": "smoke-artifacts",
    "junitFile": "results.xml",
    "summaryFile": "report.json"
  },
  "healthCheck": {
    "timeout": 30000,
    "retryInterval": 1000,
    "httpMethod": "GET"
  }
}
```

### Custom backend path (Python FastAPI)

```json
{
  "version": "1",
  "appId": "com.example.fastapi",
  "appRoot": "mobile",
  "backendRoot": "services/api",
  "platforms": ["android"],
  "services": [
    {
      "name": "fastapi-backend",
      "command": "uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload",
      "port": 8000,
      "healthPath": "/health",
      "healthTimeout": 30000,
      "retryInterval": 1000,
      "env": {
        "ENV": "test",
        "STORAGE_PATH": "./test-uploads"
      }
    }
  ],
  "metro": {
    "port": 8081
  },
  "flows": {
    "directory": "maestro",
    "canonicalFlow": "smoke.yaml"
  },
  "artifacts": {
    "outputRoot": "smoke-artifacts"
  }
}
```

---

[types-src]: ../../../packages/smoke-kit/src/config/types.ts
