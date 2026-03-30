import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("preflightCommand", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exits with preflight failure code on invalid platform", async () => {
    const { preflightCommand } = await import("../../src/commands/preflight.js");
    await expect(
      preflightCommand({ platform: "web" }),
    ).rejects.toThrow(/process\.exit/);
  });

  it("exits with config error when config file is missing", async () => {
    const { preflightCommand } = await import("../../src/commands/preflight.js");
    await expect(
      preflightCommand({
        platform: "android",
        config: "/nonexistent/smoke.config.json",
      }),
    ).rejects.toThrow(/process\.exit/);
  });
});
