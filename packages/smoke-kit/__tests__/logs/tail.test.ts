import { describe, it, expect, vi, afterEach } from "vitest";
import { tailLines } from "../../src/logs/tail.js";
import * as fs from "node:fs/promises";

vi.mock("node:fs/promises");
const mockedFs = vi.mocked(fs);

describe("tailLines", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads last 50 lines from a file with more than 50 lines", async () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`);
    mockedFs.readFile.mockResolvedValue(lines.join("\n") + "\n");

    const result = await tailLines("/some/log.txt", 50);
    expect(result).toHaveLength(50);
    expect(result[0]).toBe("line 51");
    expect(result[49]).toBe("line 100");
  });

  it("returns all lines when file is shorter than requested", async () => {
    mockedFs.readFile.mockResolvedValue("line 1\nline 2\nline 3\n");

    const result = await tailLines("/some/short.txt", 50);
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("line 1");
  });

  it("returns empty array for empty file", async () => {
    mockedFs.readFile.mockResolvedValue("");

    const result = await tailLines("/some/empty.txt");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for non-existent file", async () => {
    mockedFs.readFile.mockRejectedValue(new Error("ENOENT"));

    const result = await tailLines("/some/missing.txt");
    expect(result).toHaveLength(0);
  });
});
