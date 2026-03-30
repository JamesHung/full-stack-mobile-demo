import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";

vi.mock("node:fs/promises");
vi.mock("node:fs", async (importOriginal) => {
  const orig = await importOriginal<typeof import("node:fs")>();
  return { ...orig, existsSync: vi.fn() };
});

const mockedFs = vi.mocked(fs);
const mockedExistsSync = vi.mocked(existsSync);

describe("initCommand", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates valid config with --dry-run", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    mockedExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s.endsWith("app/app.json") || s.endsWith("/app") || s.endsWith("/backend");
    });

    mockedFs.readFile.mockResolvedValue(
      JSON.stringify({
        expo: {
          ios: { bundleIdentifier: "com.test.app" },
          android: { package: "com.test.app" },
        },
      }),
    );

    const { initCommand } = await import("../../src/commands/init.js");
    await initCommand({
      output: "smoke.config.json",
      dryRun: true,
    });

    expect(consoleSpy).toHaveBeenCalled();
    const output = consoleSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(output);
    expect(parsed.version).toBe("1.0");
    expect(parsed.appId).toBe("com.test.app");

    consoleSpy.mockRestore();
  });

  it("refuses overwrite without --force", async () => {
    mockedExistsSync.mockReturnValue(true);

    const { initCommand } = await import("../../src/commands/init.js");
    await expect(
      initCommand({ output: "smoke.config.json" }),
    ).rejects.toThrow(/process\.exit/);
  });
});
