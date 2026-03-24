import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..", "..");

function readPrintedConfig(platform: "android" | "ios", env: NodeJS.ProcessEnv = {}) {
  const output = execFileSync("bash", ["./scripts/maestro/run-local.sh", "--print-config", platform], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf-8",
  });

  return Object.fromEntries(
    output
      .trim()
      .split("\n")
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

describe("local maestro fixture contract", () => {
  it("prints Android runtime data with a deterministic run id and overridden API base URL", () => {
    const config = readPrintedConfig("android", {
      MAESTRO_OUTPUT_ROOT: ".artifacts/integration-smoke",
      SMOKE_RUN_ID: "android-print",
      EXPO_PUBLIC_API_BASE_URL_ANDROID: "http://10.10.0.3:9000/",
    });

    expect(config.PLATFORM).toBe("android");
    expect(config.NOTE_TITLE).toBe("fail weekly sync android-print");
    expect(config.API_BASE_URL).toBe("http://10.10.0.3:9000");
    expect(config.HOST_API_BASE_URL).toBe("http://127.0.0.1:8000");
    expect(config.OUTPUT_DIR).toBe(path.resolve(repoRoot, ".artifacts/integration-smoke/local/android-android-print"));
    expect(config.FLOW_FILE).toBe(path.resolve(repoRoot, ".maestro/android-smoke.yaml"));
  });

  it("prints iOS runtime data with platform-specific output paths", () => {
    const config = readPrintedConfig("ios", {
      MAESTRO_OUTPUT_ROOT: ".artifacts/integration-smoke",
      SMOKE_RUN_ID: "ios-print",
    });

    expect(config.PLATFORM).toBe("ios");
    expect(config.JUNIT_PATH).toBe(
      path.resolve(repoRoot, ".artifacts/integration-smoke/local/ios-ios-print/ios.junit.xml"),
    );
    expect(config.DEBUG_OUTPUT_DIR).toBe(
      path.resolve(repoRoot, ".artifacts/integration-smoke/local/ios-ios-print/debug"),
    );
    expect(config.FLOW_FILE).toBe(path.resolve(repoRoot, ".maestro/ios-smoke.yaml"));
  });
});
