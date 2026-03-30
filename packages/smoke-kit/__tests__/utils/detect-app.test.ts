import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectApp } from "../../src/utils/detect-app.js";
import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";

vi.mock("node:fs/promises");
vi.mock("node:fs", async (importOriginal) => {
  const orig = await importOriginal<typeof import("node:fs")>();
  return { ...orig, existsSync: vi.fn() };
});

const mockedFs = vi.mocked(fs);
const mockedExistsSync = vi.mocked(existsSync);

describe("detectApp", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("detects app from app/app.json", async () => {
    mockedExistsSync.mockImplementation((p) =>
      String(p).endsWith("app/app.json") || String(p).endsWith("/app"),
    );
    mockedFs.readFile.mockResolvedValue(
      JSON.stringify({
        expo: {
          ios: { bundleIdentifier: "com.test.myapp" },
          android: { package: "com.test.myapp" },
        },
      }),
    );

    const result = await detectApp("/project", "app");
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("com.test.myapp");
    expect(result!.appRoot).toBe("app");
  });

  it("detects app from packages/mobile/app.json", async () => {
    mockedExistsSync.mockImplementation((p) =>
      String(p).endsWith("packages/mobile/app.json") ||
      String(p).endsWith("/packages"),
    );
    mockedFs.readFile.mockResolvedValue(
      JSON.stringify({
        expo: {
          ios: { bundleIdentifier: "com.mono.app" },
        },
      }),
    );

    const result = await detectApp("/project", "packages/mobile");
    expect(result).not.toBeNull();
    expect(result!.appId).toBe("com.mono.app");
  });

  it("returns null when app.json is missing", async () => {
    mockedExistsSync.mockReturnValue(false);

    const result = await detectApp("/project", "app");
    expect(result).toBeNull();
  });

  it("returns null when platform identifiers are missing", async () => {
    mockedExistsSync.mockImplementation((p) =>
      String(p).endsWith("app/app.json") || String(p).endsWith("/app"),
    );
    mockedFs.readFile.mockResolvedValue(
      JSON.stringify({ expo: { name: "My App" } }),
    );

    const result = await detectApp("/project", "app");
    expect(result).toBeNull();
  });
});
