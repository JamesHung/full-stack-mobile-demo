import { loadConfig } from "../config/loader.js";
import { ExitCode } from "../utils/exit-codes.js";
import { isPlatform } from "../utils/platform.js";
import { executePipeline } from "../orchestrator/pipeline.js";

interface RunOptions {
  config?: string;
  mode?: string;
  skipPreflight?: boolean;
  skipBackend?: boolean;
  skipBuild?: boolean;
  runId?: string;
  timeout?: string;
  verbose?: boolean;
}

export async function runCommand(
  platform: string,
  opts: RunOptions,
): Promise<void> {
  if (!isPlatform(platform)) {
    console.error(`Invalid platform: ${platform}. Must be "android" or "ios".`);
    process.exit(ExitCode.GENERAL_ERROR);
  }

  let config;
  try {
    const result = await loadConfig(opts.config);
    config = result.config;
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.CONFIG_ERROR);
  }

  const mode: "local" | "ci" =
    opts.mode === "ci" || opts.mode === "local"
      ? opts.mode
      : process.env["CI"] === "true"
        ? "ci"
        : "local";

  const exitCode = await executePipeline({
    config,
    platform,
    mode,
    runId: opts.runId,
    skipPreflight: opts.skipPreflight,
    skipBackend: opts.skipBackend,
    skipBuild: opts.skipBuild,
    timeout: opts.timeout ? parseInt(opts.timeout, 10) : undefined,
    verbose: opts.verbose,
    configPath: opts.config ?? "smoke.config.json",
  });

  process.exit(exitCode);
}
