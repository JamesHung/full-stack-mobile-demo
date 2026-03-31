const ALLOWED_PREFIXES = [
  "pnpm",
  "npm",
  "npx",
  "make",
  "find",
  "bash",
  "sh",
  "smoke-kit",
  "node",
  "uv",
  "pytest",
  "vitest",
  "tsc",
];

export function isCommandAllowed(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;
  const firstWord = trimmed.split(/\s+/)[0]!;
  return ALLOWED_PREFIXES.some(
    (prefix) => firstWord === prefix || firstWord.endsWith(`/${prefix}`),
  );
}

export function validateCommands(
  checks: Record<string, { command: string }>,
): string[] {
  const violations: string[] = [];
  for (const [name, check] of Object.entries(checks)) {
    if (!isCommandAllowed(check.command)) {
      violations.push(
        `Check "${name}" uses disallowed command prefix: "${check.command.split(/\s+/)[0]}"`,
      );
    }
  }
  return violations;
}
