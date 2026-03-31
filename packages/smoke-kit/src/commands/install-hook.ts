import { readFile, writeFile, stat, chmod } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";

const HOOK_MARKER = "# smoke-kit pre-push hook";

const HOOK_CONTENT = `#!/bin/sh
${HOOK_MARKER}
# Installed by: smoke-kit install-hook
# Remove with: rm .git/hooks/pre-push

echo "🔒 smoke-kit: Running pre-push enforcement..."

# Escape hatch: SMOKE_SKIP=1 git push
if [ "\${SMOKE_SKIP:-0}" = "1" ]; then
  echo "⚠️  SMOKE_SKIP=1 — bypassing enforcement (logged)"
  npx smoke-kit enforce --mode local 2>/dev/null || true
  exit 0
fi

npx smoke-kit enforce --mode local
exit_code=$?

if [ $exit_code -ne 0 ]; then
  echo ""
  echo "❌ Pre-push checks failed. Fix issues above before pushing."
  echo "   Escape hatch: SMOKE_SKIP=1 git push"
  exit $exit_code
fi
`;

interface InstallHookOptions {
  force?: boolean;
}

function findGitDir(): string {
  try {
    return execSync("git rev-parse --git-dir", { encoding: "utf-8" }).trim();
  } catch {
    throw new Error("Not inside a git repository.");
  }
}

export async function installHookCommand(
  opts: InstallHookOptions,
): Promise<void> {
  const gitDir = findGitDir();
  const hookPath = resolve(join(gitDir, "hooks", "pre-push"));

  let existingContent: string | null = null;
  try {
    existingContent = await readFile(hookPath, "utf-8");
  } catch {
    // File doesn't exist — will create
  }

  // Idempotent: if already installed, skip
  if (existingContent?.includes(HOOK_MARKER)) {
    console.log("✅ smoke-kit pre-push hook already installed.");
    return;
  }

  // Collision: existing hook from different source
  if (existingContent && !opts.force) {
    console.log("⚠️  Existing pre-push hook detected.");
    console.log(`   Location: ${hookPath}`);
    console.log("");
    console.log("   Options:");
    console.log("   1. Use --force to overwrite");
    console.log(
      "   2. Manually merge by adding this to your existing hook:",
    );
    console.log('      npx smoke-kit enforce --mode local || exit $?');
    return;
  }

  // Write the hook
  try {
    await writeFile(hookPath, HOOK_CONTENT, "utf-8");
    await chmod(hookPath, 0o755);
    console.log("✅ Pre-push hook installed.");
    console.log(`   Location: ${hookPath}`);
    console.log("   Escape hatch: SMOKE_SKIP=1 git push");
  } catch (err) {
    console.error(
      `Failed to write hook: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }
}
