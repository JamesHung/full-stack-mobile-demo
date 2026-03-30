import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import type { ArtifactConfig } from "../config/types.js";
import type { Platform } from "../utils/platform.js";

export interface ArtifactPaths {
  outputDir: string;
  junitPath: string;
  summaryPath: string;
  logsDir: string;
  testOutputDir: string;
  debugOutputDir: string;
}

export async function resolveArtifactPaths(
  artifactConfig: ArtifactConfig,
  mode: "local" | "ci",
  platform: Platform,
  runId: string,
): Promise<ArtifactPaths> {
  const outputDir = join(
    artifactConfig.outputRoot,
    mode,
    `${platform}-${runId}`,
  );
  const logsDir = join(outputDir, "logs");
  const testOutputDir = join(outputDir, "test-output");
  const debugOutputDir = join(outputDir, "debug");

  await mkdir(logsDir, { recursive: true });
  await mkdir(testOutputDir, { recursive: true });
  await mkdir(debugOutputDir, { recursive: true });

  return {
    outputDir,
    junitPath: join(outputDir, artifactConfig.junitFile ?? "results.xml"),
    summaryPath: join(outputDir, artifactConfig.summaryFile ?? "summary.json"),
    logsDir,
    testOutputDir,
    debugOutputDir,
  };
}
