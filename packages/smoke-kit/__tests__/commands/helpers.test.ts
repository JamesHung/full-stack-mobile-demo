import { describe, it, expect, vi } from "vitest";
import { loadConfigOrExit, validatePlatformOrExit } from "../../src/commands/helpers.js";

vi.mock("../../src/config/loader.js", () => ({
  loadConfig: vi.fn().mockResolvedValue({
    config: {
      appRoot: "app",
      appId: "com.test",
      metro: { port: 8081 },
      services: [],
    },
  }),
}));

describe("validatePlatformOrExit", () => {
  it("returns android for valid input", () => {
    expect(validatePlatformOrExit("android")).toBe("android");
  });

  it("returns ios for valid input", () => {
    expect(validatePlatformOrExit("ios")).toBe("ios");
  });

  it("calls process.exit for invalid platform", () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    expect(() => validatePlatformOrExit("windows")).toThrow("process.exit called");
    exitSpy.mockRestore();
  });
});

describe("loadConfigOrExit", () => {
  it("returns config on success", async () => {
    const config = await loadConfigOrExit();
    expect(config.appRoot).toBe("app");
  });
});
