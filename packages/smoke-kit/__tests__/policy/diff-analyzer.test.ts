import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getChangedPaths, detectDiffMode, isShallowClone } from "../../src/policy/diff-analyzer.js";
import { execSync } from "node:child_process";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    existsSync: vi.fn(() => false),
  };
});

describe("detectDiffMode", () => {
  const originalCI = process.env["CI"];

  afterEach(() => {
    if (originalCI !== undefined) {
      process.env["CI"] = originalCI;
    } else {
      delete process.env["CI"];
    }
  });

  it("returns 'ci' when CI env is true", () => {
    process.env["CI"] = "true";
    expect(detectDiffMode()).toBe("ci");
  });

  it("returns 'local' when CI env is not set", () => {
    delete process.env["CI"];
    expect(detectDiffMode()).toBe("local");
  });

  it("returns 'local' when CI env is false", () => {
    process.env["CI"] = "false";
    expect(detectDiffMode()).toBe("local");
  });
});

describe("getChangedPaths", () => {
  const mockedExecSync = vi.mocked(execSync);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns changed paths for local mode", () => {
    mockedExecSync
      .mockReturnValueOnce("true\n" as any) // git rev-parse --is-inside-work-tree
      .mockReturnValueOnce(".git\n" as any) // git rev-parse --git-dir (isShallowClone)
      .mockReturnValueOnce("src/index.ts\nlib/utils.ts\n" as any); // git diff

    const paths = getChangedPaths("local");
    expect(paths).toEqual(["src/index.ts", "lib/utils.ts"]);
  });

  it("returns changed paths for ci mode", () => {
    mockedExecSync
      .mockReturnValueOnce("true\n" as any) // git rev-parse --is-inside-work-tree
      .mockReturnValueOnce(".git\n" as any) // git rev-parse --git-dir
      .mockReturnValueOnce("src/main.ts\n" as any); // git diff

    const paths = getChangedPaths("ci");
    expect(paths).toEqual(["src/main.ts"]);
  });

  it("returns empty array for no changes", () => {
    mockedExecSync
      .mockReturnValueOnce("true\n" as any) // git rev-parse --is-inside-work-tree
      .mockReturnValueOnce(".git\n" as any) // git rev-parse --git-dir
      .mockReturnValueOnce("\n" as any); // git diff

    const paths = getChangedPaths("local");
    expect(paths).toEqual([]);
  });

  it("throws when not in git repo", () => {
    mockedExecSync.mockImplementationOnce(() => {
      throw new Error("not a git repo");
    });

    expect(() => getChangedPaths("local")).toThrow(
      "Not inside a git repository",
    );
  });

  it("falls back to HEAD diff when main...HEAD fails in CI", () => {
    mockedExecSync
      .mockReturnValueOnce("true\n" as any) // git rev-parse --is-inside-work-tree
      .mockReturnValueOnce(".git\n" as any) // git rev-parse --git-dir
      .mockImplementationOnce(() => { throw new Error("no merge base"); }) // main...HEAD fails
      .mockReturnValueOnce("fallback.ts\n" as any); // HEAD fallback

    const paths = getChangedPaths("ci");
    expect(paths).toEqual(["fallback.ts"]);
  });
});
