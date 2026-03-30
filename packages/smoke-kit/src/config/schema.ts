import type { JSONSchemaType } from "ajv";
import type { SmokeConfig } from "./types.js";

export const smokeConfigSchema: JSONSchemaType<SmokeConfig> = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://smoke-kit.dev/schemas/smoke-config-v1.json",
  title: "Smoke Kit Configuration",
  description: "Configuration for the smoke-kit CLI tool",
  type: "object",
  required: [
    "version",
    "appId",
    "appRoot",
    "platforms",
    "services",
    "metro",
    "flows",
    "artifacts",
  ] as const,
  additionalProperties: false,
  properties: {
    $schema: {
      type: "string",
      nullable: true,
      description: "JSON Schema reference for editor autocompletion",
    },
    version: {
      type: "string",
      enum: ["1.0"],
      description: "Schema version identifier",
    },
    appId: {
      type: "string",
      pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+$",
      description: "Application identifier (e.g., com.demo.voicenotes)",
    },
    appRoot: {
      type: "string",
      pattern: "^[^/]",
      description: "Relative path to the Expo mobile app directory",
    },
    backendRoot: {
      type: "string",
      pattern: "^[^/]",
      nullable: true,
      description: "Relative path to the backend directory",
    },
    platforms: {
      type: "array",
      items: {
        type: "string",
        enum: ["android", "ios"],
      },
      minItems: 1,
      uniqueItems: true,
      description: "Supported target platforms",
    },
    services: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "command"],
        additionalProperties: false,
        properties: {
          name: {
            type: "string",
            minLength: 1,
            description: "Unique human-readable service name",
          },
          command: {
            type: "string",
            minLength: 1,
            description: "Shell command to start the service",
          },
          port: {
            type: "integer",
            minimum: 1,
            maximum: 65535,
            nullable: true,
            description: "TCP port the service listens on (omit for background workers)",
          },
          healthPath: {
            type: "string",
            nullable: true,
            description: "HTTP path for health check probe",
          },
          healthTimeout: {
            type: "integer",
            minimum: 1,
            nullable: true,
            description: "Health check timeout in seconds",
          },
          retryInterval: {
            type: "integer",
            minimum: 1,
            nullable: true,
            description: "Seconds between health check retries",
          },
          logFile: {
            type: "string",
            nullable: true,
            description: "Log file name within artifacts log directory",
          },
          env: {
            type: "object",
            nullable: true,
            required: [],
            additionalProperties: { type: "string" },
            description: "Additional environment variables for the service",
          },
        },
      },
      description: "Backend services to start and health-check",
    },
    metro: {
      type: "object",
      required: ["port"],
      additionalProperties: false,
      properties: {
        port: {
          type: "integer",
          minimum: 1,
          maximum: 65535,
          description: "Metro bundler port",
        },
        host: {
          type: "string",
          nullable: true,
          description: "Metro bundler host",
        },
        healthPath: {
          type: "string",
          nullable: true,
          description: "Metro health check endpoint",
        },
        healthTimeout: {
          type: "integer",
          minimum: 1,
          nullable: true,
          description: "Seconds to wait for Metro readiness",
        },
        command: {
          type: "string",
          nullable: true,
          description: "Shell command to start Metro bundler",
        },
        logFile: {
          type: "string",
          nullable: true,
          description: "Log file name within artifacts log directory",
        },
        env: {
          type: "object",
          nullable: true,
          required: [] as const,
          additionalProperties: { type: "string" },
          description: "Additional environment variables for Metro",
        },
      },
      description: "Metro bundler configuration",
    },
    flows: {
      type: "object",
      required: ["directory"],
      additionalProperties: false,
      properties: {
        directory: {
          type: "string",
          pattern: "^[^/]",
          description: "Directory containing Maestro flow files",
        },
        androidFlow: {
          type: "string",
          nullable: true,
          description: "Android platform wrapper flow file",
        },
        iosFlow: {
          type: "string",
          nullable: true,
          description: "iOS platform wrapper flow file",
        },
        canonicalFlow: {
          type: "string",
          nullable: true,
          description: "Shared canonical flow file",
        },
      },
      description: "Maestro flow file configuration",
    },
    artifacts: {
      type: "object",
      required: ["outputRoot"],
      additionalProperties: false,
      properties: {
        outputRoot: {
          type: "string",
          pattern: "^[^/]",
          description: "Root directory for test output",
        },
        junitFile: {
          type: "string",
          nullable: true,
          description: "JUnit XML filename",
        },
        summaryFile: {
          type: "string",
          nullable: true,
          description: "Run summary filename",
        },
      },
      description: "Output artifact path configuration",
    },
    healthCheck: {
      type: "object",
      nullable: true,
      required: [] as const,
      additionalProperties: false,
      properties: {
        timeout: {
          type: "integer",
          minimum: 1,
          nullable: true,
          description: "Default timeout in seconds",
        },
        retryInterval: {
          type: "integer",
          minimum: 1,
          nullable: true,
          description: "Default retry interval in seconds",
        },
        httpMethod: {
          type: "string",
          enum: ["GET", "HEAD"],
          nullable: true,
          description: "HTTP method for health probes",
        },
      },
      description: "Global health check defaults",
    },
    emulator: {
      type: "object",
      nullable: true,
      required: [] as const,
      additionalProperties: false,
      properties: {
        avd: {
          type: "string",
          nullable: true,
          description: "AVD name to boot (auto-detected from emulator -list-avds if omitted)",
        },
        simulatorUdid: {
          type: "string",
          nullable: true,
          description: "iOS simulator UDID to boot (auto-detected if omitted)",
        },
        bootTimeout: {
          type: "integer",
          minimum: 10,
          nullable: true,
          description: "Seconds to wait for emulator boot (default: 120)",
        },
      },
      description: "Android emulator lifecycle configuration",
    },
  },
};
