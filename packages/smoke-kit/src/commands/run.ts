import { ExitCode } from "../utils/exit-codes.js";
import { executePipeline } from "../orchestrator/pipeline.js";
import { loadConfigOrExit, validatePlatformOrExit } from "./helpers.js";

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
  const validPlatform = validatePlatformOrExit(platform);
  const config = await loadConfigOrExit(opts.config);

  const mode: "local" | "ci" =
    opts.mode === "ci" || opts.mode === "local"
      ? opts.mode
      : process.env["CI"] === "true"
        ? "ci"
        : "local";

  const exitCode = await executePipeline({
    config,
    platform: validPlatform,
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
