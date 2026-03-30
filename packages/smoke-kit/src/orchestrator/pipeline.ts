import { join, resolve } from "node:path";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import type {
  SmokeConfig,
  StageResult,
  SmokeRun,
  ErrorSummary,
} from "../config/types.js";
import type { Platform } from "../utils/platform.js";
import { generateRunId } from "../utils/platform.js";
import { ExitCode, exitCodeLabel } from "../utils/exit-codes.js";
import { startService, isProcessAlive } from "./service-manager.js";
import { registerCleanup, killAllServices } from "./cleanup.js";
import { tcpProbe } from "../health/tcp-probe.js";
import { httpProbe } from "../health/http-probe.js";
import { tailLines } from "../logs/tail.js";
import { buildErrorSummary } from "../logs/error-summary.js";
import { execSync, spawnSync } from "node:child_process";

export interface PipelineOptions {
  config: SmokeConfig;
  platform: Platform;
  mode: "local" | "ci";
  runId?: string;
  skipPreflight?: boolean;
  skipBackend?: boolean;
  skipBuild?: boolean;
  timeout?: number;
  verbose?: boolean;
  configPath: string;
}

export async function executePipeline(
  opts: PipelineOptions,
): Promise<number> {
  registerCleanup();

  const runId = opts.runId ?? generateRunId(process.env["SMOKE_RUN_ID"]);
  const outputDir = join(
    opts.config.artifacts.outputRoot,
    opts.mode,
    `${opts.platform}-${runId}`,
  );
  const logsDir = join(outputDir, "logs");
  await mkdir(logsDir, { recursive: true });

  const stages: StageResult[] = [];
  const startedAt = new Date().toISOString();
  let finalExitCode = ExitCode.SUCCESS;

  const runStage = async (
    name: string,
    exitCode: ExitCode,
    fn: () => Promise<void>,
  ): Promise<boolean> => {
    const stageStart = Date.now();
    try {
      await fn();
      stages.push({
        name,
        status: "passed",
        exitCode: 0,
        durationMs: Date.now() - stageStart,
        error: null,
      });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      stages.push({
        name,
        status: "failed",
        exitCode,
        durationMs: Date.now() - stageStart,
        error,
      });
      finalExitCode = exitCode;

      // Collect logs and show error summary
      const logFiles = getAllLogFiles(opts.config, logsDir);
      const logTails: string[] = [];
      for (const lf of logFiles) {
        const lines = await tailLines(lf, 50);
        if (lines.length > 0) {
          logTails.push(`--- ${lf} ---`, ...lines);
        }
      }

      const summary = buildErrorSummary({
        stage: name,
        exitCode,
        durationMs: Date.now() - stageStart,
        logTail: logTails,
      });
      console.error(summary.renderedText);

      // Write to GitHub Step Summary in CI mode
      const stepSummaryPath = process.env["GITHUB_STEP_SUMMARY"];
      if (stepSummaryPath) {
        await appendFile(stepSummaryPath, summary.renderedMarkdown + "\n");
      }

      return false;
    }
  };

  // Stage 1: Preflight (optional)
  if (!opts.skipPreflight) {
    const ok = await runStage("preflight", ExitCode.PREFLIGHT_FAILURE, async () => {
      // Basic toolchain check
      for (const tool of ["node", "pnpm", "maestro"]) {
        try {
          execSync(`which ${tool}`, { stdio: "ignore" });
        } catch {
          throw new Error(`Required tool not found: ${tool}`);
        }
      }
      if (opts.platform === "android") {
        try {
          execSync("which adb", { stdio: "ignore" });
        } catch {
          throw new Error("Required tool not found: adb");
        }
      }
      if (opts.platform === "ios") {
        try {
          execSync("which xcrun", { stdio: "ignore" });
        } catch {
          throw new Error("Required tool not found: xcrun");
        }
      }
    });
    if (!ok) { killAllServices(); return writeSummaryAndExit(); }
  } else {
    stages.push({
      name: "preflight",
      status: "skipped",
      exitCode: 0,
      durationMs: 0,
      error: null,
    });
  }

  // Stage 2: Service Startup
  if (!opts.skipBackend && opts.config.services.length > 0) {
    const ok = await runStage("service-startup", ExitCode.SERVICE_STARTUP_FAILURE, async () => {
      for (const svc of opts.config.services) {
        const logFile = join(logsDir, svc.logFile ?? `${svc.name}.log`);
        if (opts.verbose) console.log(`Starting service: ${svc.name}`);
        const tracked = await startService(svc.name, svc.command, logFile, svc.env);

        // Brief wait to check for early crash
        await new Promise((r) => setTimeout(r, 1000));
        if (!isProcessAlive(tracked.pid)) {
          throw new Error(
            `Service "${svc.name}" exited immediately after startup`,
          );
        }
      }

      // Start Metro bundler
      const metroCommand = opts.config.metro.command
        ?? `pnpm --filter ${opts.config.appRoot} exec expo start --dev-client --port ${opts.config.metro.port}`;
      const metroLogFile = join(logsDir, opts.config.metro.logFile ?? "metro.log");

      const backendPort = opts.config.services[0]?.port ?? 8000;
      const androidApiUrl = `http://10.0.2.2:${backendPort}`;
      const iosApiUrl = `http://127.0.0.1:${backendPort}`;

      const metroEnv: Record<string, string> = {
        CI: "1",
        EXPO_NO_TELEMETRY: "1",
        EXPO_PUBLIC_API_BASE_URL: opts.platform === "android" ? androidApiUrl : iosApiUrl,
        EXPO_PUBLIC_API_BASE_URL_ANDROID: androidApiUrl,
        EXPO_PUBLIC_API_BASE_URL_IOS: iosApiUrl,
        ...opts.config.metro.env,
      };

      if (opts.verbose) console.log(`Starting Metro: ${metroCommand}`);
      const metroTracked = await startService("metro", metroCommand, metroLogFile, metroEnv);

      await new Promise((r) => setTimeout(r, 2000));
      if (!isProcessAlive(metroTracked.pid)) {
        throw new Error("Metro bundler exited immediately after startup");
      }
    });
    if (!ok) { killAllServices(); return writeSummaryAndExit(); }
  }

  // Stage 3: Health Check
  if (!opts.skipBackend && opts.config.services.length > 0) {
    const ok = await runStage("health-check", ExitCode.HEALTH_CHECK_TIMEOUT, async () => {
      const defaults = opts.config.healthCheck;

      for (const svc of opts.config.services) {
        if (!svc.port) {
          if (opts.verbose) console.log(`Skipping health check for ${svc.name} (no port configured)`);
          continue;
        }

        const timeout = svc.healthTimeout ?? defaults?.timeout ?? 60;
        const interval = svc.retryInterval ?? defaults?.retryInterval ?? 2;

        // TCP probe first
        if (opts.verbose) console.log(`TCP probing ${svc.name} on port ${svc.port}...`);
        const tcpOk = await tcpProbe({
          port: svc.port,
          timeout,
          retryInterval: interval,
        });
        if (!tcpOk) {
          throw new Error(
            `Health check failed: ${svc.name} not listening on port ${svc.port} within ${timeout}s`,
          );
        }

        // HTTP probe if path configured
        if (svc.healthPath) {
          const url = `http://127.0.0.1:${svc.port}${svc.healthPath}`;
          if (opts.verbose) console.log(`HTTP probing ${svc.name} at ${url}...`);
          const httpOk = await httpProbe({
            url,
            timeout: Math.max(timeout - 10, 10),
            retryInterval: interval,
            method: defaults?.httpMethod,
          });
          if (!httpOk) {
            throw new Error(
              `Health check failed: ${svc.name} HTTP endpoint ${svc.healthPath} not responding within ${timeout}s`,
            );
          }
        }
      }

      // Metro health check
      const metroUrl = `http://${opts.config.metro.host ?? "127.0.0.1"}:${opts.config.metro.port}${opts.config.metro.healthPath ?? "/status"}`;
      if (opts.verbose) console.log(`Probing Metro at ${metroUrl}...`);
      const metroTimeout = opts.config.metro.healthTimeout ?? 60;
      const metroTcp = await tcpProbe({
        port: opts.config.metro.port,
        host: opts.config.metro.host ?? "127.0.0.1",
        timeout: metroTimeout,
        retryInterval: 2,
      });
      if (!metroTcp) {
        throw new Error(
          `Health check failed: Metro not listening on port ${opts.config.metro.port} within ${metroTimeout}s`,
        );
      }
    });
    if (!ok) { killAllServices(); return writeSummaryAndExit(); }
  }

  // Stage 4: Test Execution
  {
    const ok = await runStage("test-execution", ExitCode.TEST_EXECUTION_FAILURE, async () => {
      // Dismiss ANR / system dialogs on Android emulators before running tests
      if (opts.platform === "android") {
        try {
          execSync("adb shell settings put global hide_error_dialogs 1", { stdio: "ignore", timeout: 5000 });
          execSync("adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS", { stdio: "ignore", timeout: 5000 });
          // Forward host ports so the emulator can reach Metro and backend
          for (const svc of opts.config.services) {
            if (svc.port) {
              execSync(`adb reverse tcp:${svc.port} tcp:${svc.port}`, { stdio: "ignore", timeout: 5000 });
            }
          }
          execSync(`adb reverse tcp:${opts.config.metro.port} tcp:${opts.config.metro.port}`, { stdio: "ignore", timeout: 5000 });
          if (opts.verbose) console.log("Prepared Android emulator (dialogs dismissed, ports forwarded)");
        } catch {
          // Best effort — emulator may not support these commands
        }
      }

      const flowDir = opts.config.flows.directory;
      const flowFile =
        opts.platform === "android"
          ? opts.config.flows.androidFlow ?? "android-smoke.yaml"
          : opts.config.flows.iosFlow ?? "ios-smoke.yaml";
      const fullFlowPath = join(flowDir, flowFile);

      const junitPath = join(
        outputDir,
        opts.config.artifacts.junitFile ?? "results.xml",
      );
      const testOutputDir = join(outputDir, "test-output");
      const debugOutputDir = join(outputDir, "debug");
      await mkdir(testOutputDir, { recursive: true });
      await mkdir(debugOutputDir, { recursive: true });

      const deviceId = process.env["MAESTRO_DEVICE_ID"] ?? "";

      const noteTitle = process.env["SMOKE_NOTE_TITLE"]?.trim()
        || `fail weekly sync ${runId}`;

      const maestroArgs = [
        `--platform=${opts.platform}`,
        ...(deviceId ? [`--device=${deviceId}`] : []),
        "test",
        fullFlowPath,
        `--format=JUNIT`,
        `--output=${junitPath}`,
        `--test-output-dir=${testOutputDir}`,
        `--debug-output=${debugOutputDir}`,
        "--flatten-debug-output",
        "-e", `SMOKE_NOTE_TITLE=${noteTitle}`,
        "-e", `SMOKE_RUN_ID=${runId}`,
        "-e", `SMOKE_PLATFORM=${opts.platform}`,
        "-e", `SMOKE_APP_ID=${opts.config.appId}`,
      ];

      if (opts.verbose) console.log(`Running: maestro ${maestroArgs.join(" ")}`);

      const maestroLog = join(logsDir, "maestro.log");
      const result = spawnSync("maestro", maestroArgs, {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          SMOKE_RUN_ID: runId,
          SMOKE_PLATFORM: opts.platform,
          SMOKE_APP_ID: opts.config.appId,
          SMOKE_NOTE_TITLE: noteTitle,
        },
        timeout: (opts.timeout ?? 300) * 1000,
      });

      // Write maestro output to log file
      if (result.stdout) {
        await writeFile(maestroLog, result.stdout, "utf-8");
      }
      if (result.stderr) {
        await appendFile(maestroLog, result.stderr, "utf-8");
      }

      if (result.status !== 0) {
        throw new Error(
          `Maestro tests failed with exit code ${result.status}`,
        );
      }
    });
    if (!ok) { killAllServices(); return writeSummaryAndExit(); }
  }

  // Cleanup
  killAllServices();
  stages.push({
    name: "cleanup",
    status: "passed",
    exitCode: 0,
    durationMs: 0,
    error: null,
  });

  console.log(`\n✅ Smoke test passed for ${opts.platform} (run: ${runId})`);

  return writeSummaryAndExit();

  async function writeSummaryAndExit(): Promise<number> {
    const run: SmokeRun = {
      runId,
      platform: opts.platform,
      mode: opts.mode,
      startedAt,
      completedAt: new Date().toISOString(),
      stages,
      exitCode: finalExitCode,
      artifactPaths: {
        outputDir,
        junit: join(outputDir, opts.config.artifacts.junitFile ?? "results.xml"),
        summary: join(outputDir, opts.config.artifacts.summaryFile ?? "summary.json"),
        logs: logsDir,
      },
    };

    const summaryPath = join(
      outputDir,
      opts.config.artifacts.summaryFile ?? "summary.json",
    );
    try {
      await writeFile(summaryPath, JSON.stringify(run, null, 2), "utf-8");
    } catch {
      // Best effort
    }

    return finalExitCode;
  }
}

function getAllLogFiles(config: SmokeConfig, logsDir: string): string[] {
  const files: string[] = [];
  for (const svc of config.services) {
    files.push(join(logsDir, svc.logFile ?? `${svc.name}.log`));
  }
  files.push(join(logsDir, "maestro.log"));
  return files;
}
