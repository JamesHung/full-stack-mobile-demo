import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv from "ajv";
import { smokeConfigSchema } from "./schema.js";
import type { SmokeConfig } from "./types.js";

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(smokeConfigSchema);

export interface ConfigLoadResult {
  config: SmokeConfig;
  path: string;
}

export interface ConfigValidationError {
  path: string;
  message: string;
  value?: unknown;
}

export function formatValidationErrors(
  errors: ConfigValidationError[],
): string {
  const lines = errors.map(
    (e) =>
      `  ✖ ${e.path} — ${e.message}${e.value !== undefined ? ` (received: ${JSON.stringify(e.value)})` : ""}`,
  );
  return [
    "Error: Invalid smoke.config.json",
    "",
    ...lines,
    "",
    "Fix the errors above and re-run the command.",
    `Schema reference: ${smokeConfigSchema.$id}`,
  ].join("\n");
}

export async function loadConfig(
  configPath?: string,
): Promise<ConfigLoadResult> {
  const resolvedPath = resolve(
    configPath ?? process.env["SMOKE_CONFIG_PATH"] ?? "smoke.config.json",
  );

  let raw: string;
  try {
    raw = await readFile(resolvedPath, "utf-8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error(
        `Config file not found: ${resolvedPath}\nRun 'smoke-kit init' to generate one.`,
      );
    }
    throw new Error(`Failed to read config file: ${resolvedPath}\n${err}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Invalid JSON in config file: ${resolvedPath}\nCheck for syntax errors.`,
    );
  }

  const valid = validate(parsed);
  if (!valid && validate.errors) {
    const errors: ConfigValidationError[] = validate.errors.map((e) => ({
      path: e.instancePath || "/",
      message: e.message ?? "unknown error",
      value: e.params?.["allowedValues"] ?? undefined,
    }));
    throw new Error(formatValidationErrors(errors));
  }

  return { config: parsed as SmokeConfig, path: resolvedPath };
}
