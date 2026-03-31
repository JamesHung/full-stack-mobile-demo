import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import Ajv from "ajv";
import picomatch from "picomatch";
import type { SmokePlan, CheckPlan, ResolvedCheck, PolicyRule } from "./types.js";
import { smokePlanSchema } from "./schema.js";
import { validateCommands } from "./allowlist.js";

const DEFAULT_TIMEOUT_S = 300;
const DEFAULT_PLAN_FILE = "smoke-plan.yml";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(smokePlanSchema);

export async function readPolicyFile(
  planPath?: string,
): Promise<SmokePlan> {
  const resolvedPath = resolve(
    planPath ?? process.env["SMOKE_PLAN_PATH"] ?? DEFAULT_PLAN_FILE,
  );

  let raw: string;
  try {
    raw = await readFile(resolvedPath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(
        `Policy file not found: ${resolvedPath}\n` +
          "smoke-plan.yml is required (fail-closed). Create one at the repo root.",
      );
    }
    throw new Error(`Failed to read policy file: ${resolvedPath}\n${err}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `Invalid YAML in policy file: ${resolvedPath}\n` +
        (err instanceof Error ? err.message : String(err)),
    );
  }

  const valid = validate(parsed);
  if (!valid && validate.errors) {
    const details = validate.errors
      .map((e) => `  ✖ ${e.instancePath || "/"} — ${e.message}`)
      .join("\n");
    throw new Error(
      `Invalid smoke-plan.yml:\n${details}\n\nFix the errors above.`,
    );
  }

  const plan = parsed as SmokePlan;

  // Validate check references in rules
  for (const rule of plan.rules) {
    for (const checkName of rule.checks) {
      if (!plan.checks[checkName]) {
        throw new Error(
          `Rule references undefined check "${checkName}". ` +
            `Available checks: ${Object.keys(plan.checks).join(", ")}`,
        );
      }
    }
  }

  // Validate command allowlist
  const violations = validateCommands(plan.checks);
  if (violations.length > 0) {
    throw new Error(
      "Command allowlist violation:\n" +
        violations.map((v) => `  ✖ ${v}`).join("\n"),
    );
  }

  return plan;
}

export function resolveChecks(
  plan: SmokePlan,
  changedPaths: string[],
  diffSource: string,
): CheckPlan {
  if (changedPaths.length === 0) {
    return { checks: [], matchedRules: [], changedPaths: [], diffSource };
  }

  const matchedCheckNames = new Set<string>();
  const matchedRules: PolicyRule[] = [];

  for (const rule of plan.rules) {
    const matcher = picomatch(rule.paths);
    const ruleMatches = changedPaths.some((p) => matcher(p));
    if (ruleMatches) {
      matchedRules.push(rule);
      for (const checkName of rule.checks) {
        matchedCheckNames.add(checkName);
      }
    }
  }

  const checks: ResolvedCheck[] = Array.from(matchedCheckNames).map((name) => {
    const def = plan.checks[name]!;
    return {
      name,
      command: def.command,
      timeout_s: def.timeout_s ?? DEFAULT_TIMEOUT_S,
    };
  });

  return { checks, matchedRules, changedPaths, diffSource };
}
