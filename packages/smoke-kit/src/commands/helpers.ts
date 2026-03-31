import { loadConfig } from "../config/loader.js";
import type { SmokeConfig } from "../config/types.js";
import { ExitCode } from "../utils/exit-codes.js";
import type { Platform } from "../utils/platform.js";
import { isPlatform } from "../utils/platform.js";

export async function loadConfigOrExit(configPath?: string): Promise<SmokeConfig> {
  try {
    const result = await loadConfig(configPath);
    return result.config;
  } catch (err) {
    console.error(String(err instanceof Error ? err.message : err));
    process.exit(ExitCode.CONFIG_ERROR);
  }
}

export function validatePlatformOrExit(platform: string): Platform {
  if (!isPlatform(platform)) {
    console.error(`Invalid platform: "${platform}". Must be "android" or "ios".`);
    process.exit(ExitCode.GENERAL_ERROR);
  }
  return platform;
}
