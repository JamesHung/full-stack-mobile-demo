import { readPolicyFile, resolveChecks } from "../policy/reader.js";
import { getChangedPaths, detectDiffMode } from "../policy/diff-analyzer.js";
import { readLastRun } from "../metrics/writer.js";
import { ExitCode } from "../utils/exit-codes.js";
import type { DiffMode } from "../policy/diff-analyzer.js";

interface PlanOptions {
  planFile?: string;
  json?: boolean;
  lastRun?: boolean;
  verbose?: boolean;
  mode?: string;
}

export async function planCommand(opts: PlanOptions): Promise<void> {
  let plan;
  try {
    plan = await readPolicyFile(opts.planFile);
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.CONFIG_ERROR);
  }

  const diffMode: DiffMode =
    opts.mode === "ci" ? "ci" : opts.mode === "local" ? "local" : detectDiffMode();

  let changedPaths: string[];
  try {
    changedPaths = getChangedPaths(diffMode, opts.verbose);
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.GENERAL_ERROR);
  }

  const checkPlan = resolveChecks(plan, changedPaths, diffMode);

  if (opts.lastRun) {
    const lastRun = await readLastRun();
    if (lastRun) {
      if (opts.json) {
        checkPlan.checks;  // already in checkPlan
      } else {
        console.log("\n📋 Last run:");
        console.log(`   Trigger: ${lastRun.trigger}`);
        console.log(`   Checks: ${lastRun.checks.join(", ")}`);
        console.log(`   Duration: ${lastRun.duration_s}s`);
        if (lastRun.ci_time_saved_s) {
          console.log(`   CI time saved: ~${lastRun.ci_time_saved_s}s`);
        }
      }
    }
  }

  if (opts.json) {
    console.log(JSON.stringify(checkPlan, null, 2));
    return;
  }

  // Human-readable output
  if (checkPlan.checks.length === 0) {
    console.log("✅ No checks required for current changes.");
    return;
  }

  console.log(`\n🔍 Diff source: ${checkPlan.diffSource}`);
  console.log(`📁 Changed paths: ${checkPlan.changedPaths.length}`);
  if (opts.verbose) {
    for (const p of checkPlan.changedPaths) {
      console.log(`   ${p}`);
    }
  }

  console.log(`\n📋 Required checks (${checkPlan.checks.length}):`);
  for (const check of checkPlan.checks) {
    console.log(`   • ${check.name} (timeout: ${check.timeout_s}s)`);
    if (opts.verbose) {
      console.log(`     command: ${check.command}`);
    }
  }

  const matchedPaths = checkPlan.matchedRules.flatMap((r) => r.paths);
  console.log(`\n📌 Matched rules: ${checkPlan.matchedRules.length} (patterns: ${[...new Set(matchedPaths)].join(", ")})`);
}
