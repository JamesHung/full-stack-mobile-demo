import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { detectApp } from "../utils/detect-app.js";
import { loadConfig } from "../config/loader.js";
import type { SmokeConfig } from "../config/types.js";
import { ExitCode } from "../utils/exit-codes.js";
import Ajv from "ajv";
import { smokeConfigSchema } from "../config/schema.js";

interface InitOptions {
  appRoot?: string;
  backendRoot?: string;
  appId?: string;
  output: string;
  force?: boolean;
  dryRun?: boolean;
}

export async function initCommand(opts: InitOptions): Promise<void> {
  const projectRoot = process.cwd();
  const outputPath = resolve(projectRoot, opts.output);

  // Check for existing config
  if (existsSync(outputPath) && !opts.force && !opts.dryRun) {
    console.error(
      `Config file already exists: ${outputPath}\nUse --force to overwrite.`,
    );
    process.exit(ExitCode.CONFIG_ERROR);
  }

  // Detect app info
  let appId = opts.appId;
  let appRoot = opts.appRoot;
  let backendRoot = opts.backendRoot;

  if (!appId || !appRoot) {
    const detected = await detectApp(projectRoot, opts.appRoot);
    if (detected) {
      appId = appId ?? detected.appId;
      appRoot = appRoot ?? detected.appRoot;
    }
  }

  if (!appId) {
    console.error(
      "Could not detect app ID. Provide --app-id or ensure app.json has expo.ios.bundleIdentifier or expo.android.package.",
    );
    process.exit(ExitCode.CONFIG_ERROR);
  }

  appRoot = appRoot ?? "app";

  // Detect backend root
  if (!backendRoot) {
    for (const candidate of ["backend", "api", "server"]) {
      if (existsSync(resolve(projectRoot, candidate))) {
        backendRoot = candidate;
        break;
      }
    }
  }

  const config: SmokeConfig = {
    version: "1.0",
    appId,
    appRoot,
    backendRoot,
    platforms: ["android", "ios"],
    services: backendRoot
      ? [
          {
            name: "backend-api",
            command: `uv run --directory ${backendRoot} uvicorn ${backendRoot}.src.main:app --host 0.0.0.0 --port 8000`,
            port: 8000,
            healthPath: "/docs",
            healthTimeout: 60,
            retryInterval: 2,
            logFile: "backend-api.log",
          },
        ]
      : [],
    metro: {
      port: 8081,
      host: "127.0.0.1",
      healthPath: "/status",
      healthTimeout: 60,
    },
    flows: {
      directory: ".maestro",
      androidFlow: "android-smoke.yaml",
      iosFlow: "ios-smoke.yaml",
      canonicalFlow: "canonical-flow.yaml",
    },
    artifacts: {
      outputRoot: ".artifacts/maestro",
      junitFile: "results.xml",
      summaryFile: "summary.json",
    },
    healthCheck: {
      timeout: 60,
      retryInterval: 2,
      httpMethod: "GET",
    },
  };

  // Validate before writing
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(smokeConfigSchema);
  if (!validate(config)) {
    console.error("Generated config failed validation — this is a bug.");
    console.error(JSON.stringify(validate.errors, null, 2));
    process.exit(ExitCode.GENERAL_ERROR);
  }

  const json = JSON.stringify(config, null, 2) + "\n";

  if (opts.dryRun) {
    console.log(json);
    return;
  }

  await writeFile(outputPath, json, "utf-8");
  console.log(`✅ Generated ${outputPath}`);
}
