import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appendMetric, readLastRun } from "../../src/metrics/writer.js";
import { writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { MetricEntry } from "../../src/policy/types.js";

describe("MetricsWriter", () => {
  let testDir: string;
  let metricsPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `smoke-metrics-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    metricsPath = join(testDir, "metrics.jsonl");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("appends a metric entry", async () => {
    const entry: MetricEntry = {
      timestamp: "2026-03-31T00:00:00Z",
      trigger: "enforce",
      checks: ["lint", "test"],
      duration_s: 42,
    };

    await appendMetric(entry, metricsPath);

    const content = await readFile(metricsPath, "utf-8");
    const parsed = JSON.parse(content.trim());
    expect(parsed.trigger).toBe("enforce");
    expect(parsed.checks).toEqual(["lint", "test"]);
  });

  it("appends multiple entries", async () => {
    await appendMetric(
      { timestamp: "t1", trigger: "enforce", checks: ["a"], duration_s: 1 },
      metricsPath,
    );
    await appendMetric(
      { timestamp: "t2", trigger: "plan", checks: ["b"], duration_s: 2 },
      metricsPath,
    );

    const content = await readFile(metricsPath, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines).toHaveLength(2);
  });

  it("creates parent directory if missing", async () => {
    const deepPath = join(testDir, "sub", "dir", "metrics.jsonl");
    await appendMetric(
      { timestamp: "t", trigger: "enforce", checks: [], duration_s: 0 },
      deepPath,
    );
    const content = await readFile(deepPath, "utf-8");
    expect(content.trim()).not.toBe("");
  });
});

describe("readLastRun", () => {
  let testDir: string;
  let metricsPath: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `smoke-metrics-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    metricsPath = join(testDir, "metrics.jsonl");
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("returns null when no file exists", async () => {
    const result = await readLastRun(metricsPath);
    expect(result).toBeNull();
  });

  it("returns last entry from file", async () => {
    await writeFile(
      metricsPath,
      '{"timestamp":"t1","trigger":"enforce","checks":["a"],"duration_s":1}\n' +
        '{"timestamp":"t2","trigger":"plan","checks":["b"],"duration_s":2}\n',
    );

    const result = await readLastRun(metricsPath);
    expect(result).not.toBeNull();
    expect(result!.trigger).toBe("plan");
    expect(result!.timestamp).toBe("t2");
  });

  it("returns null for empty file", async () => {
    await writeFile(metricsPath, "");
    const result = await readLastRun(metricsPath);
    expect(result).toBeNull();
  });
});
