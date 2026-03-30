# Configuration Schema: smoke.config.json

**Format**: JSON Schema Draft-07
**Validator**: `ajv` (runtime)
**Source of truth**: `packages/smoke-kit/src/config/schema.ts`

## Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://smoke-kit.dev/schemas/smoke-config-v1.json",
  "title": "Smoke Kit Configuration",
  "description": "Configuration for the smoke-kit CLI tool",
  "type": "object",
  "required": ["version", "appId", "appRoot", "platforms", "services", "metro", "flows", "artifacts"],
  "additionalProperties": false,
  "properties": {
    "$schema": {
      "type": "string",
      "description": "JSON Schema reference for editor autocompletion"
    },
    "version": {
      "type": "string",
      "enum": ["1.0"],
      "description": "Schema version identifier"
    },
    "appId": {
      "type": "string",
      "pattern": "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+$",
      "description": "Application identifier (e.g., com.demo.voicenotes)"
    },
    "appRoot": {
      "type": "string",
      "pattern": "^[^/]",
      "description": "Relative path to the Expo mobile app directory"
    },
    "backendRoot": {
      "type": "string",
      "pattern": "^[^/]",
      "description": "Relative path to the backend directory"
    },
    "platforms": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["android", "ios"]
      },
      "minItems": 1,
      "uniqueItems": true,
      "description": "Supported target platforms"
    },
    "services": {
      "type": "array",
      "items": { "$ref": "#/definitions/ServiceConfig" },
      "description": "Backend services to start and health-check"
    },
    "metro": {
      "$ref": "#/definitions/MetroConfig",
      "description": "Metro bundler configuration"
    },
    "flows": {
      "$ref": "#/definitions/FlowConfig",
      "description": "Maestro flow file configuration"
    },
    "artifacts": {
      "$ref": "#/definitions/ArtifactConfig",
      "description": "Output artifact path configuration"
    },
    "healthCheck": {
      "$ref": "#/definitions/HealthCheckDefaults",
      "description": "Global health check defaults"
    }
  },
  "definitions": {
    "ServiceConfig": {
      "type": "object",
      "required": ["name", "command", "port"],
      "additionalProperties": false,
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1,
          "description": "Unique human-readable service name"
        },
        "command": {
          "type": "string",
          "minLength": 1,
          "description": "Shell command to start the service"
        },
        "port": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535,
          "description": "TCP port the service listens on"
        },
        "healthPath": {
          "type": "string",
          "default": "/",
          "description": "HTTP path for health check probe"
        },
        "healthTimeout": {
          "type": "integer",
          "minimum": 1,
          "default": 60,
          "description": "Health check timeout in seconds"
        },
        "retryInterval": {
          "type": "integer",
          "minimum": 1,
          "default": 2,
          "description": "Seconds between health check retries"
        },
        "logFile": {
          "type": "string",
          "description": "Log file name within artifacts log directory"
        },
        "env": {
          "type": "object",
          "additionalProperties": { "type": "string" },
          "default": {},
          "description": "Additional environment variables for the service"
        }
      }
    },
    "MetroConfig": {
      "type": "object",
      "required": ["port"],
      "additionalProperties": false,
      "properties": {
        "port": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535,
          "default": 8081,
          "description": "Metro bundler port"
        },
        "host": {
          "type": "string",
          "default": "127.0.0.1",
          "description": "Metro bundler host"
        },
        "healthPath": {
          "type": "string",
          "default": "/status",
          "description": "Metro health check endpoint"
        },
        "healthTimeout": {
          "type": "integer",
          "minimum": 1,
          "default": 60,
          "description": "Seconds to wait for Metro readiness"
        }
      }
    },
    "FlowConfig": {
      "type": "object",
      "required": ["directory"],
      "additionalProperties": false,
      "properties": {
        "directory": {
          "type": "string",
          "pattern": "^[^/]",
          "default": ".maestro",
          "description": "Directory containing Maestro flow files"
        },
        "androidFlow": {
          "type": "string",
          "default": "android-smoke.yaml",
          "description": "Android platform wrapper flow file"
        },
        "iosFlow": {
          "type": "string",
          "default": "ios-smoke.yaml",
          "description": "iOS platform wrapper flow file"
        },
        "canonicalFlow": {
          "type": "string",
          "default": "canonical-flow.yaml",
          "description": "Shared canonical flow file"
        }
      }
    },
    "ArtifactConfig": {
      "type": "object",
      "required": ["outputRoot"],
      "additionalProperties": false,
      "properties": {
        "outputRoot": {
          "type": "string",
          "pattern": "^[^/]",
          "default": ".artifacts/maestro",
          "description": "Root directory for test output"
        },
        "junitFile": {
          "type": "string",
          "default": "results.xml",
          "description": "JUnit XML filename"
        },
        "summaryFile": {
          "type": "string",
          "default": "summary.json",
          "description": "Run summary filename"
        }
      }
    },
    "HealthCheckDefaults": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "timeout": {
          "type": "integer",
          "minimum": 1,
          "default": 60,
          "description": "Default timeout in seconds"
        },
        "retryInterval": {
          "type": "integer",
          "minimum": 1,
          "default": 2,
          "description": "Default retry interval in seconds"
        },
        "httpMethod": {
          "type": "string",
          "enum": ["GET", "HEAD"],
          "default": "GET",
          "description": "HTTP method for health probes"
        }
      }
    }
  }
}
```

## Example Configuration

```json
{
  "$schema": "https://smoke-kit.dev/schemas/smoke-config-v1.json",
  "version": "1.0",
  "appId": "com.demo.voicenotes",
  "appRoot": "app",
  "backendRoot": "backend",
  "platforms": ["android", "ios"],
  "services": [
    {
      "name": "backend-api",
      "command": "uv run --directory backend uvicorn backend.src.main:app --host 0.0.0.0 --port 8000",
      "port": 8000,
      "healthPath": "/debug/db-dump",
      "healthTimeout": 60,
      "retryInterval": 2,
      "logFile": "backend-api.log"
    },
    {
      "name": "worker",
      "command": "uv run --directory backend python -m backend.src.workers.notes",
      "port": 8001,
      "healthTimeout": 30,
      "logFile": "worker.log",
      "env": {
        "VOICE_NOTES_PROCESSING_POLL_INTERVAL_MS": "200"
      }
    }
  ],
  "metro": {
    "port": 8081,
    "host": "127.0.0.1",
    "healthPath": "/status",
    "healthTimeout": 60
  },
  "flows": {
    "directory": ".maestro",
    "androidFlow": "android-smoke.yaml",
    "iosFlow": "ios-smoke.yaml",
    "canonicalFlow": "canonical-flow.yaml"
  },
  "artifacts": {
    "outputRoot": ".artifacts/maestro",
    "junitFile": "results.xml",
    "summaryFile": "summary.json"
  },
  "healthCheck": {
    "timeout": 60,
    "retryInterval": 2,
    "httpMethod": "GET"
  }
}
```

## Validation Error Format

When `smoke.config.json` fails schema validation, the CLI outputs:

```
Error: Invalid smoke.config.json

  ✖ /services/0/port — must be integer (received: "8000")
  ✖ /appId — must match pattern "^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$" (received: "MyApp")
  ✖ /platforms — must contain at least 1 items

Fix the errors above and re-run the command.
Schema reference: https://smoke-kit.dev/schemas/smoke-config-v1.json
```
