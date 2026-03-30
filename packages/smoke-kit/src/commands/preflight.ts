import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { loadConfig } from "../config/loader.js";
import { ExitCode } from "../utils/exit-codes.js";
import type { Platform } from "../utils/platform.js";
import { isPlatform } from "../utils/platform.js";

interface PreflightOptions {
  platform: string;
  config?: string;
  json?: boolean;
}

interface CheckResult {
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
  remediation?: string;
}

export async function preflightCommand(opts: PreflightOptions): Promise<void> {
  const platform = opts.platform;
  if (!isPlatform(platform)) {
    console.error(`Invalid platform: ${platform}. Must be "android" or "ios".`);
    process.exit(ExitCode.PREFLIGHT_FAILURE);
  }

  let config;
  try {
    const result = await loadConfig(opts.config);
    config = result.config;
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.CONFIG_ERROR);
  }

  const checks: CheckResult[] = [];

  // Toolchain checks
  const universalTools = ["node", "pnpm", "maestro"];
  const androidTools = ["adb", "java"];
  const iosTools = ["xcodebuild", "xcrun"];
  const backendTools = config.backendRoot ? ["uv", "curl"] : [];

  const tools = [
    ...universalTools,
    ...(platform === "android" ? androidTools : iosTools),
    ...backendTools,
  ];

  // maestro (JVM-based) needs longer timeout for cold start
  const toolTimeout = (t: string) => (t === "maestro" ? 15_000 : 5_000);

  for (const tool of tools) {
    try {
      const version = execSync(`${tool} --version 2>/dev/null || ${tool} -version 2>/dev/null || echo "available"`, {
        encoding: "utf-8",
        timeout: toolTimeout(tool),
      }).trim().split("\n")[0] ?? "available";
      checks.push({ name: tool, status: "pass", detail: version });
    } catch {
      checks.push({
        name: tool,
        status: "fail",
        detail: "Not found",
        remediation: `Install ${tool} and ensure it is on your PATH`,
      });
    }
  }

  // Workspace checks
  const projectRoot = process.cwd();

  // node_modules
  if (existsSync(join(projectRoot, "node_modules"))) {
    checks.push({ name: "node_modules", status: "pass", detail: "present" });
  } else {
    checks.push({
      name: "node_modules",
      status: "fail",
      detail: "missing",
      remediation: "Run 'pnpm install'",
    });
  }

  // Backend venv
  if (config.backendRoot) {
    const venvPath = join(projectRoot, config.backendRoot, ".venv");
    if (existsSync(venvPath)) {
      checks.push({
        name: `${config.backendRoot}/.venv`,
        status: "pass",
        detail: "present",
      });
    } else {
      checks.push({
        name: `${config.backendRoot}/.venv`,
        status: "fail",
        detail: "missing",
        remediation: `Run 'uv sync --directory ${config.backendRoot}'`,
      });
    }
  }

  // app.json
  const appJsonPath = join(projectRoot, config.appRoot, "app.json");
  if (existsSync(appJsonPath)) {
    checks.push({
      name: "app.json",
      status: "pass",
      detail: `found at ${config.appRoot}/app.json`,
    });
  } else {
    checks.push({
      name: "app.json",
      status: "fail",
      detail: `not found at ${config.appRoot}/app.json`,
      remediation: "Verify appRoot in smoke.config.json",
    });
  }

  // Device check
  checks.push(checkDevice(platform));

  // Port availability
  for (const svc of config.services) {
    if (svc.port) {
      checks.push(checkPort(svc.port, svc.name));
    }
  }
  checks.push(checkPort(config.metro.port, "metro"));

  // Output
  const hasFail = checks.some((c) => c.status === "fail");
  const hasWarn = checks.some((c) => c.status === "warn");

  if (opts.json) {
    console.log(
      JSON.stringify({ platform, passed: !hasFail, checks }, null, 2),
    );
  } else {
    console.log(`Smoke Kit Preflight — ${platform}`);
    console.log("─".repeat(35));
    for (const check of checks) {
      const icon = check.status === "pass" ? "✅" : check.status === "warn" ? "⚠️" : "❌";
      console.log(`${icon} ${check.name.padEnd(18)} ${check.detail}`);
      if (check.remediation) {
        console.log(`   ↳ ${check.remediation}`);
      }
    }
    console.log();
    if (!hasFail && !hasWarn) {
      console.log("All checks passed. Ready to run smoke tests.");
    } else if (!hasFail) {
      console.log("All critical checks passed. Warnings will be handled automatically by 'smoke-kit run'.");
    } else {
      console.log("Some checks failed. Fix the issues above before running.");
    }
  }

  process.exit(hasFail ? ExitCode.PREFLIGHT_FAILURE : ExitCode.SUCCESS);
}

function checkDevice(platform: Platform): CheckResult {
  if (platform === "android") {
    try {
      const output = execSync('adb devices | awk \'NR > 1 && $2 == "device" { print $1 }\'', {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
      if (output) {
        return {
          name: "emulator",
          status: "pass",
          detail: `${output.split("\n")[0]} (booted)`,
        };
      }
      return {
        name: "emulator",
        status: "warn",
        detail: "No booted device — will be started by 'smoke-kit run'",
      };
    } catch {
      return {
        name: "emulator",
        status: "warn",
        detail: "adb not responding — emulator will be started on run",
      };
    }
  } else {
    try {
      const output = execSync(
        "xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1",
        { encoding: "utf-8", timeout: 5000 },
      ).trim();
      if (output) {
        return {
          name: "simulator",
          status: "pass",
          detail: `${output} (booted)`,
        };
      }
      return {
        name: "simulator",
        status: "warn",
        detail: "No booted simulator found",
        remediation: "Will need a booted simulator for 'smoke-kit run'",
      };
    } catch {
      return {
        name: "simulator",
        status: "fail",
        detail: "xcrun not available",
        remediation: "Install Xcode Command Line Tools",
      };
    }
  }
}

function checkPort(port: number, label: string): CheckResult {
  try {
    execSync(`lsof -i :${port} -sTCP:LISTEN`, {
      encoding: "utf-8",
      timeout: 3000,
    });
    return {
      name: `port ${port}`,
      status: "warn",
      detail: `in use (${label}) — will be reclaimed on run`,
    };
  } catch {
    return {
      name: `port ${port}`,
      status: "pass",
      detail: `available (${label})`,
    };
  }
}
