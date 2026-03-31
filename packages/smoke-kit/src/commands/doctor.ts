import { existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { readLastRun } from "../metrics/writer.js";

interface DiagnosticResult {
  name: string;
  status: "ok" | "warn" | "error";
  message: string;
}

async function checkGit(): Promise<DiagnosticResult> {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    return { name: "git", status: "ok", message: "Inside git repository" };
  } catch {
    return { name: "git", status: "error", message: "Not inside a git repository" };
  }
}

function checkPolicyFile(): DiagnosticResult {
  if (existsSync("smoke-plan.yml")) {
    return { name: "smoke-plan.yml", status: "ok", message: "Policy file found" };
  }
  return { name: "smoke-plan.yml", status: "error", message: "Missing — enforcement will fail (fail-closed)" };
}

function checkSmokeConfig(): DiagnosticResult {
  if (existsSync("smoke.config.json")) {
    return { name: "smoke.config.json", status: "ok", message: "Smoke config found" };
  }
  return { name: "smoke.config.json", status: "warn", message: "Missing — run 'smoke-kit init' to create" };
}

function checkNode(): DiagnosticResult {
  try {
    const v = execSync("node --version", { encoding: "utf-8" }).trim();
    return { name: "node", status: "ok", message: `Found ${v}` };
  } catch {
    return { name: "node", status: "error", message: "Not found" };
  }
}

function checkPnpm(): DiagnosticResult {
  try {
    const v = execSync("pnpm --version", { encoding: "utf-8" }).trim();
    return { name: "pnpm", status: "ok", message: `Found v${v}` };
  } catch {
    return { name: "pnpm", status: "error", message: "Not found" };
  }
}

function checkPrePushHook(): DiagnosticResult {
  try {
    const gitDir = execSync("git rev-parse --git-dir", { encoding: "utf-8" }).trim();
    const hookPath = `${gitDir}/hooks/pre-push`;
    if (!existsSync(hookPath)) {
      return { name: "pre-push hook", status: "warn", message: "Not installed. Run: smoke-kit install-hook" };
    }
    const content = readFileSync(hookPath, "utf-8");
    if (content.includes("smoke-kit")) {
      return { name: "pre-push hook", status: "ok", message: "smoke-kit hook installed" };
    }
    return { name: "pre-push hook", status: "warn", message: "Exists but not smoke-kit — run with --force to replace" };
  } catch {
    return { name: "pre-push hook", status: "warn", message: "Could not check" };
  }
}

function checkPorts(): DiagnosticResult {
  try {
    const lsof = execSync("lsof -i :8000 -P -n 2>/dev/null | head -2", {
      encoding: "utf-8",
    }).trim();
    if (lsof && lsof.split("\n").length > 1) {
      return { name: "port 8000", status: "warn", message: "Port 8000 is in use (backend conflict?)" };
    }
    return { name: "port 8000", status: "ok", message: "Available" };
  } catch {
    return { name: "port 8000", status: "ok", message: "Available" };
  }
}

export async function doctorCommand(): Promise<void> {
  console.log("🩺 smoke-kit doctor\n");

  const diagnostics: DiagnosticResult[] = [
    await checkGit(),
    checkPolicyFile(),
    checkSmokeConfig(),
    checkNode(),
    checkPnpm(),
    checkPrePushHook(),
    checkPorts(),
  ];

  for (const d of diagnostics) {
    const icon =
      d.status === "ok" ? "✅" : d.status === "warn" ? "⚠️ " : "❌";
    console.log(`  ${icon} ${d.name}: ${d.message}`);
  }

  // Last run status
  const lastRun = await readLastRun();
  if (lastRun) {
    console.log(`\n📋 Last run: ${lastRun.trigger} (${lastRun.timestamp})`);
    console.log(`   Checks: ${lastRun.checks.join(", ") || "none"}`);
    console.log(`   Duration: ${lastRun.duration_s}s`);
  } else {
    console.log("\n📋 No previous runs found.");
  }

  const errors = diagnostics.filter((d) => d.status === "error");
  const warns = diagnostics.filter((d) => d.status === "warn");

  console.log("");
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s) found. Fix before running enforcement.`);
  } else if (warns.length > 0) {
    console.log(`⚠️  ${warns.length} warning(s). System is functional but not fully configured.`);
  } else {
    console.log("✅ All checks passed. System is ready.");
  }
}
