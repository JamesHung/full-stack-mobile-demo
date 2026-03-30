import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadConfig, formatValidationErrors } from "../../src/config/loader.js";
import * as fs from "node:fs/promises";
import { resolve } from "node:path";

vi.mock("node:fs/promises");

const mockedFs = vi.mocked(fs);

function validConfigJson() {
  return JSON.stringify({
    version: "1.0",
    appId: "com.test.app",
    appRoot: "app",
    platforms: ["android"],
    services: [{ name: "api", command: "node srv.js", port: 8000 }],
    metro: { port: 8081 },
    flows: { directory: ".maestro" },
    artifacts: { outputRoot: ".artifacts/maestro" },
  });
}

describe("loadConfig", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads and validates a valid config", async () => {
    mockedFs.readFile.mockResolvedValue(validConfigJson());
    const result = await loadConfig("smoke.config.json");
    expect(result.config.appId).toBe("com.test.app");
    expect(result.config.version).toBe("1.0");
  });

  it("throws on file not found", async () => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    mockedFs.readFile.mockRejectedValue(err);
    await expect(loadConfig("missing.json")).rejects.toThrow("Config file not found");
  });

  it("throws on invalid JSON", async () => {
    mockedFs.readFile.mockResolvedValue("{ invalid json");
    await expect(loadConfig("bad.json")).rejects.toThrow("Invalid JSON");
  });

  it("throws on schema validation failure with formatted errors", async () => {
    mockedFs.readFile.mockResolvedValue(JSON.stringify({ version: "1.0" }));
    await expect(loadConfig("incomplete.json")).rejects.toThrow(
      "Invalid smoke.config.json",
    );
  });
});

describe("formatValidationErrors", () => {
  it("formats errors with path and message", () => {
    const result = formatValidationErrors([
      { path: "/appId", message: 'must match pattern', value: "MyApp" },
      { path: "/platforms", message: "must contain at least 1 items" },
    ]);
    expect(result).toContain("✖ /appId");
    expect(result).toContain("MyApp");
    expect(result).toContain("✖ /platforms");
  });
});
