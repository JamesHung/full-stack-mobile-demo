import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { existsSync } from "node:fs";

export interface DetectedApp {
  appId: string;
  appRoot: string;
  iosBundleIdentifier?: string;
  androidPackage?: string;
}

export async function detectApp(
  projectRoot: string,
  appRootHint?: string,
): Promise<DetectedApp | null> {
  const candidatePaths = appRootHint
    ? [resolve(projectRoot, appRootHint)]
    : findAppRootCandidates(projectRoot);

  for (const candidateDir of candidatePaths) {
    const appJsonPath = join(candidateDir, "app.json");
    if (!existsSync(appJsonPath)) continue;

    try {
      const raw = await readFile(appJsonPath, "utf-8");
      const parsed = JSON.parse(raw);
      const expo = parsed?.expo;
      if (!expo) continue;

      const ios = expo.ios?.bundleIdentifier as string | undefined;
      const android = expo.android?.package as string | undefined;
      const appId = ios ?? android;
      if (!appId) continue;

      const relativeRoot = candidateDir
        .replace(projectRoot, "")
        .replace(/^\//, "");

      return {
        appId,
        appRoot: relativeRoot || ".",
        iosBundleIdentifier: ios,
        androidPackage: android,
      };
    } catch {
      continue;
    }
  }

  return null;
}

function findAppRootCandidates(projectRoot: string): string[] {
  const candidates: string[] = [];

  // Check app/ first (most common)
  const appDir = join(projectRoot, "app");
  if (existsSync(appDir)) candidates.push(appDir);

  // Check packages/*/ for monorepo layouts
  const packagesDir = join(projectRoot, "packages");
  if (existsSync(packagesDir)) {
    try {
      const { readdirSync } = require("node:fs");
      const entries = readdirSync(packagesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          candidates.push(join(packagesDir, entry.name));
        }
      }
    } catch {
      // ignore
    }
  }

  // Check project root itself
  candidates.push(projectRoot);

  return candidates;
}
