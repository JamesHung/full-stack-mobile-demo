import { writeFile, copyFile, mkdir, readFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { detectApp } from "../utils/detect-app.js";
import { ExitCode } from "../utils/exit-codes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "../../templates");

interface ScaffoldOptions {
  appRoot?: string;
  backendRoot?: string;
  appId?: string;
  platform: string;
  outputDir: string;
  force?: boolean;
  dryRun?: boolean;
}

interface FileMapping {
  templatePath: string;
  targetPath: string;
}

export async function scaffoldCommand(opts: ScaffoldOptions): Promise<void> {
  const projectRoot = resolve(process.cwd(), opts.outputDir);

  // Detect app info
  let appId = opts.appId;
  let appRoot = opts.appRoot;
  let backendRoot = opts.backendRoot;

  if (!appId || !appRoot) {
    const detected = await detectApp(projectRoot, opts.appRoot);
    if (detected) {
      appId = appId ?? detected.appId;
      appRoot = appRoot ?? detected.appRoot;
    }
  }

  appId = appId ?? "com.example.app";
  appRoot = appRoot ?? "app";

  if (!backendRoot) {
    for (const candidate of ["backend", "api", "server"]) {
      if (existsSync(resolve(projectRoot, candidate))) {
        backendRoot = candidate;
        break;
      }
    }
    backendRoot = backendRoot ?? "backend";
  }

  const apiPort = "8000";
  const metroPort = "8081";

  const substitutions: Record<string, string> = {
    "{{APP_ID}}": appId,
    "{{APP_ROOT}}": appRoot,
    "{{BACKEND_ROOT}}": backendRoot,
    "{{API_PORT}}": apiPort,
    "{{METRO_PORT}}": metroPort,
  };

  const fileMappings: FileMapping[] = [
    {
      templatePath: join(TEMPLATES_DIR, "smoke.config.json"),
      targetPath: join(projectRoot, "smoke.config.json"),
    },
    {
      templatePath: join(TEMPLATES_DIR, "scripts", "run-smoke.sh"),
      targetPath: join(projectRoot, "scripts", "maestro", "run-smoke.sh"),
    },
    {
      templatePath: join(TEMPLATES_DIR, "flows", "android-smoke.yaml"),
      targetPath: join(projectRoot, ".maestro", "android-smoke.yaml"),
    },
    {
      templatePath: join(TEMPLATES_DIR, "flows", "ios-smoke.yaml"),
      targetPath: join(projectRoot, ".maestro", "ios-smoke.yaml"),
    },
    {
      templatePath: join(TEMPLATES_DIR, "flows", "canonical-flow.yaml"),
      targetPath: join(projectRoot, ".maestro", "canonical-flow.yaml"),
    },
    {
      templatePath: join(TEMPLATES_DIR, "workflows", "smoke.yml"),
      targetPath: join(
        projectRoot,
        ".github",
        "workflows",
        "mobile-smoke.yml",
      ),
    },
  ];

  // Filter platforms
  const platforms = opts.platform.split(",").map((p) => p.trim());
  const filteredMappings = fileMappings.filter((m) => {
    if (m.templatePath.includes("android") && !platforms.includes("android"))
      return false;
    if (m.templatePath.includes("ios") && !platforms.includes("ios"))
      return false;
    return true;
  });

  if (opts.dryRun) {
    console.log("Files that would be created:");
    for (const mapping of filteredMappings) {
      const exists = existsSync(mapping.targetPath);
      const status = exists ? (opts.force ? " (overwrite)" : " (skip — exists)") : "";
      console.log(`  ${mapping.targetPath}${status}`);
    }
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const mapping of filteredMappings) {
    if (existsSync(mapping.targetPath) && !opts.force) {
      console.log(`  ⏭ Skip: ${mapping.targetPath} (exists)`);
      skipped++;
      continue;
    }

    await mkdir(dirname(mapping.targetPath), { recursive: true });

    if (mapping.templatePath.endsWith(".sh")) {
      let content = await readFile(mapping.templatePath, "utf-8");
      content = applySubstitutions(content, substitutions);
      await writeFile(mapping.targetPath, content, { mode: 0o755 });
    } else {
      let content = await readFile(mapping.templatePath, "utf-8");
      content = applySubstitutions(content, substitutions);
      await writeFile(mapping.targetPath, content, "utf-8");
    }

    console.log(`  ✅ Created: ${mapping.targetPath}`);
    created++;
  }

  console.log(`\nScaffold complete: ${created} created, ${skipped} skipped.`);
}

function applySubstitutions(
  content: string,
  substitutions: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(substitutions)) {
    result = result.replaceAll(key, value);
  }
  return result;
}
