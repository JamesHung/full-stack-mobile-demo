import { spawn } from "node:child_process";
import { readPolicyFile, resolveChecks } from "../policy/reader.js";
import {
  getChangedPaths,
  detectDiffMode,
} from "../policy/diff-analyzer.js";
import { appendMetric } from "../metrics/writer.js";
import { ExitCode } from "../utils/exit-codes.js";
import type { CheckResult } from "../policy/types.js";
import type { DiffMode } from "../policy/diff-analyzer.js";
import type { ResolvedCheck } from "../policy/types.js";

interface EnforceOptions {
  planFile?: string;
  verbose?: boolean;
  mode?: string;
}

function isSmokeCheck(name: string): boolean {
  return name.includes("smoke") || name.includes("maestro");
}

async function executeCheck(
  check: ResolvedCheck,
  verbose?: boolean,
): Promise<CheckResult> {
  const start = Date.now();

  return new Promise((resolve) => {
    if (verbose) console.log(`\n▶ Running: ${check.name}`);
    if (verbose) console.log(`  command: ${check.command}`);

    const child = spawn("sh", ["-c", check.command], {
      stdio: verbose ? "inherit" : "ignore",
      timeout: check.timeout_s * 1000,
    });

    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          process.kill(-child.pid!, "SIGTERM");
        } catch {
          try {
            child.kill("SIGTERM");
          } catch { /* already dead */ }
        }
        resolve({
          name: check.name,
          command: check.command,
          status: "timeout",
          durationMs: Date.now() - start,
          exitCode: null,
          error: `Timed out after ${check.timeout_s}s`,
        });
      }
    }, check.timeout_s * 1000);

    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          name: check.name,
          command: check.command,
          status: code === 0 ? "passed" : "failed",
          durationMs: Date.now() - start,
          exitCode: code,
          error: code !== 0 ? `Exited with code ${code}` : null,
        });
      }
    });

    child.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve({
          name: check.name,
          command: check.command,
          status: "failed",
          durationMs: Date.now() - start,
          exitCode: null,
          error: err.message,
        });
      }
    });
  });
}

export async function enforceCommand(opts: EnforceOptions): Promise<void> {
  const enforceStart = Date.now();

  // Check SMOKE_SKIP escape hatch
  if (process.env["SMOKE_SKIP"] === "1") {
    console.log("⚠️  SMOKE_SKIP=1 — bypassing enforcement (logged)");
    await appendMetric({
      timestamp: new Date().toISOString(),
      trigger: "skip",
      checks: [],
      duration_s: 0,
      reason: "manual_override",
    });
    return;
  }

  let plan;
  try {
    plan = await readPolicyFile(opts.planFile);
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.CONFIG_ERROR);
  }

  const diffMode: DiffMode =
    opts.mode === "ci"
      ? "ci"
      : opts.mode === "local"
        ? "local"
        : detectDiffMode();

  let changedPaths: string[];
  try {
    changedPaths = getChangedPaths(diffMode, opts.verbose);
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.GENERAL_ERROR);
  }

  const checkPlan = resolveChecks(plan, changedPaths, diffMode);

  if (checkPlan.checks.length === 0) {
    console.log("✅ No checks required for current changes.");
    await appendMetric({
      timestamp: new Date().toISOString(),
      trigger: "enforce",
      checks: [],
      duration_s: Math.round((Date.now() - enforceStart) / 1000),
    });
    return;
  }

  console.log(`\n🔒 Enforcing ${checkPlan.checks.length} checks...`);

  // Separate smoke checks (sequential) from independent checks (parallel)
  const smokeChecks = checkPlan.checks.filter((c) => isSmokeCheck(c.name));
  const independentChecks = checkPlan.checks.filter(
    (c) => !isSmokeCheck(c.name),
  );

  const allResults: CheckResult[] = [];
  let hasFailure = false;

  // Run independent checks in parallel with first smoke check
  const parallelWork: Promise<CheckResult[]>[] = [];

  if (independentChecks.length > 0) {
    parallelWork.push(
      Promise.all(
        independentChecks.map((c) => executeCheck(c, opts.verbose)),
      ),
    );
  }

  if (smokeChecks.length > 0) {
    // Run first smoke check in parallel with independent checks
    parallelWork.push(
      executeCheck(smokeChecks[0]!, opts.verbose).then((r) => [r]),
    );
  }

  // Wait for parallel batch
  const parallelResults = await Promise.all(parallelWork);
  for (const batch of parallelResults) {
    allResults.push(...batch);
  }

  // Check for failures in parallel batch
  for (const r of allResults) {
    if (r.status !== "passed") hasFailure = true;
  }

  // Run remaining smoke checks sequentially (if first batch passed)
  if (!hasFailure) {
    for (let i = 1; i < smokeChecks.length; i++) {
      const result = await executeCheck(smokeChecks[i]!, opts.verbose);
      allResults.push(result);
      if (result.status !== "passed") {
        hasFailure = true;
        break;
      }
    }
  }

  // Print summary
  const totalDuration = Math.round((Date.now() - enforceStart) / 1000);
  console.log("\n" + "─".repeat(50));
  console.log("📊 Enforcement summary:");

  for (const r of allResults) {
    const icon = r.status === "passed" ? "✅" : r.status === "timeout" ? "⏰" : "❌";
    const dur = (r.durationMs / 1000).toFixed(1);
    console.log(`   ${icon} ${r.name} (${dur}s)${r.error ? ` — ${r.error}` : ""}`);
  }

  // Time saved estimate
  const ciDuration = plan.ci_average_duration_s ?? 720;
  const timeSaved = ciDuration - totalDuration;
  if (timeSaved > 0 && !hasFailure) {
    console.log(`\n⏱️  Estimated CI time saved: ~${Math.round(timeSaved / 60)}min`);
  }

  console.log(`   Total: ${totalDuration}s`);

  // Log metrics
  await appendMetric({
    timestamp: new Date().toISOString(),
    trigger: "enforce",
    checks: allResults.map((r) => r.name),
    results: allResults,
    duration_s: totalDuration,
    ci_time_saved_s: timeSaved > 0 ? timeSaved : undefined,
  });

  if (hasFailure) {
    console.error("\n❌ Enforcement failed. Fix the issues above before pushing.");
    process.exit(ExitCode.TEST_EXECUTION_FAILURE);
  }

  console.log("\n✅ All checks passed.");
}
