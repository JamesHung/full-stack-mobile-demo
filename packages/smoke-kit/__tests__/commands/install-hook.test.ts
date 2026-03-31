import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// We test install-hook by mocking git dir detection
vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";
import { installHookCommand } from "../../src/commands/install-hook.js";
import { readFileSync, existsSync } from "node:fs";

describe("installHookCommand", () => {
  let testDir: string;
  let hooksDir: string;
  const mockedExecSync = vi.mocked(execSync);

  beforeEach(async () => {
    testDir = join(tmpdir(), `smoke-hook-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    hooksDir = join(testDir, "hooks");
    await mkdir(hooksDir, { recursive: true });

    mockedExecSync.mockReturnValue(testDir as any);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    vi.clearAllMocks();
  });

  it("creates hook when none exists", async () => {
    await installHookCommand({});

    const hookPath = join(hooksDir, "pre-push");
    expect(existsSync(hookPath)).toBe(true);
    const content = readFileSync(hookPath, "utf-8");
    expect(content).toContain("smoke-kit");
    expect(content).toContain("#!/bin/sh");
  });

  it("is idempotent — skips when already installed", async () => {
    await installHookCommand({});
    // Running again should not throw
    await installHookCommand({});

    const hookPath = join(hooksDir, "pre-push");
    const content = readFileSync(hookPath, "utf-8");
    expect(content).toContain("smoke-kit");
  });

  it("warns on existing non-smoke-kit hook without --force", async () => {
    const hookPath = join(hooksDir, "pre-push");
    await writeFile(hookPath, "#!/bin/sh\necho custom hook\n");

    const warnSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await installHookCommand({});

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Existing pre-push hook detected"),
    );

    // Original content preserved
    const content = readFileSync(hookPath, "utf-8");
    expect(content).toContain("custom hook");
    expect(content).not.toContain("smoke-kit");

    warnSpy.mockRestore();
  });

  it("overwrites with --force", async () => {
    const hookPath = join(hooksDir, "pre-push");
    await writeFile(hookPath, "#!/bin/sh\necho custom hook\n");

    await installHookCommand({ force: true });

    const content = readFileSync(hookPath, "utf-8");
    expect(content).toContain("smoke-kit");
    expect(content).not.toContain("custom hook");
  });
});
