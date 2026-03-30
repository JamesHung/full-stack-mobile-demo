import { describe, it, expect } from "vitest";
import Ajv from "ajv";
import { smokeConfigSchema } from "../../src/config/schema.js";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(smokeConfigSchema);

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    version: "1.0",
    appId: "com.demo.voicenotes",
    appRoot: "app",
    platforms: ["android"],
    services: [
      { name: "api", command: "node server.js", port: 8000 },
    ],
    metro: { port: 8081 },
    flows: { directory: ".maestro" },
    artifacts: { outputRoot: ".artifacts/maestro" },
    ...overrides,
  };
}

describe("smoke config schema", () => {
  it("accepts a valid minimal config", () => {
    expect(validate(validConfig())).toBe(true);
  });

  it("accepts a full config with all optional fields", () => {
    const config = validConfig({
      $schema: "https://smoke-kit.dev/schemas/smoke-config-v1.json",
      backendRoot: "backend",
      platforms: ["android", "ios"],
      services: [
        {
          name: "backend-api",
          command: "uv run uvicorn app:main",
          port: 8000,
          healthPath: "/health",
          healthTimeout: 30,
          retryInterval: 2,
          logFile: "api.log",
          env: { NODE_ENV: "test" },
        },
      ],
      metro: {
        port: 8081,
        host: "127.0.0.1",
        healthPath: "/status",
        healthTimeout: 60,
      },
      flows: {
        directory: ".maestro",
        androidFlow: "android.yaml",
        iosFlow: "ios.yaml",
        canonicalFlow: "main.yaml",
      },
      artifacts: {
        outputRoot: ".artifacts/maestro",
        junitFile: "results.xml",
        summaryFile: "summary.json",
      },
      healthCheck: {
        timeout: 60,
        retryInterval: 2,
        httpMethod: "GET",
      },
    });
    expect(validate(config)).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(validate({})).toBe(false);
    const paths = validate.errors?.map((e) => e.instancePath + "|" + e.keyword);
    expect(paths).toContain("|required");
  });

  it("rejects invalid appId pattern", () => {
    expect(validate(validConfig({ appId: "MyApp" }))).toBe(false);
    const match = validate.errors?.find((e) => e.keyword === "pattern" && e.instancePath === "/appId");
    expect(match).toBeDefined();
  });

  it("rejects absolute appRoot path", () => {
    expect(validate(validConfig({ appRoot: "/absolute/path" }))).toBe(false);
  });

  it("rejects port out of range", () => {
    expect(
      validate(validConfig({ metro: { port: 0 } })),
    ).toBe(false);
    expect(
      validate(validConfig({ metro: { port: 70000 } })),
    ).toBe(false);
  });

  it("rejects empty platforms array", () => {
    expect(validate(validConfig({ platforms: [] }))).toBe(false);
  });

  it("rejects invalid platform value", () => {
    expect(validate(validConfig({ platforms: ["web"] }))).toBe(false);
  });

  it("validates service config port range", () => {
    expect(
      validate(
        validConfig({
          services: [
            { name: "api", command: "node srv.js", port: 99999 },
          ],
        }),
      ),
    ).toBe(false);
  });

  it("rejects service with empty name", () => {
    expect(
      validate(
        validConfig({
          services: [{ name: "", command: "node srv.js", port: 8000 }],
        }),
      ),
    ).toBe(false);
  });

  it("validates healthCheck httpMethod enum", () => {
    expect(
      validate(
        validConfig({ healthCheck: { httpMethod: "POST" } }),
      ),
    ).toBe(false);
  });
});
