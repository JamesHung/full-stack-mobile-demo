import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { MetricEntry } from "../policy/types.js";

const DEFAULT_METRICS_PATH = ".smoke-kit/metrics.jsonl";

export async function appendMetric(
  entry: MetricEntry,
  metricsPath?: string,
): Promise<void> {
  const resolvedPath = resolve(metricsPath ?? DEFAULT_METRICS_PATH);
  try {
    await mkdir(dirname(resolvedPath), { recursive: true });
    await appendFile(resolvedPath, JSON.stringify(entry) + "\n", "utf-8");
  } catch (err) {
    console.warn(
      `Warning: Could not write metrics to ${resolvedPath}: ${err instanceof Error ? err.message : err}`,
    );
  }
}

export async function readLastRun(
  metricsPath?: string,
): Promise<MetricEntry | null> {
  const resolvedPath = resolve(metricsPath ?? DEFAULT_METRICS_PATH);
  try {
    const content = await readFile(resolvedPath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    if (lines.length === 0) return null;
    return JSON.parse(lines[lines.length - 1]!) as MetricEntry;
  } catch {
    return null;
  }
}
