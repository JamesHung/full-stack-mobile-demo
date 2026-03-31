import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export type DiffMode = "ci" | "local";

export function detectDiffMode(): DiffMode {
  if (process.env["CI"] === "true") return "ci";
  return "local";
}

export function isShallowClone(): boolean {
  try {
    const shallow = join(
      execSync("git rev-parse --git-dir", { encoding: "utf-8" }).trim(),
      "shallow",
    );
    return existsSync(shallow);
  } catch {
    return false;
  }
}

export function unshallow(verbose?: boolean): void {
  if (verbose) console.log("Shallow clone detected, fetching full history...");
  try {
    execSync("git fetch --unshallow", { stdio: verbose ? "inherit" : "ignore", timeout: 60_000 });
  } catch {
    if (verbose) console.log("git fetch --unshallow failed (may already be complete)");
  }
}

export function getChangedPaths(
  mode: DiffMode,
  verbose?: boolean,
): string[] {
  // Ensure we're in a git repo
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
  } catch {
    throw new Error(
      "Not inside a git repository. smoke-kit policy requires git.",
    );
  }

  // Auto-unshallow if needed
  if (isShallowClone()) {
    unshallow(verbose);
  }

  const diffCommand =
    mode === "ci"
      ? "git diff --name-only main...HEAD"
      : "git diff --name-only HEAD";

  if (verbose) console.log(`Running: ${diffCommand}`);

  let output: string;
  try {
    output = execSync(diffCommand, { encoding: "utf-8", timeout: 30_000 });
  } catch {
    // Fallback: if main...HEAD fails (no common ancestor), try HEAD only
    if (mode === "ci") {
      if (verbose) console.log("Falling back to git diff --name-only HEAD");
      try {
        output = execSync("git diff --name-only HEAD", {
          encoding: "utf-8",
          timeout: 30_000,
        });
      } catch {
        throw new Error("Failed to determine changed files via git diff.");
      }
    } else {
      throw new Error("Failed to determine changed files via git diff.");
    }
  }

  return output
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}
