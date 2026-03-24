import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { buildSmokeConfig, buildSmokeNoteTitle } = require("../../scripts/maestro/runtime-config.cjs") as {
  buildSmokeConfig: (args: {
    platform: "android" | "ios";
    mode?: "local" | "ci";
    env?: Record<string, string>;
  }) => {
    flowFile: string;
    outputDir: string;
    junitPath: string;
    artifactName: string;
    apiBaseUrl: string;
    hostApiBaseUrl: string;
    apiHealthUrl: string;
    noteTitle: string;
  };
  buildSmokeNoteTitle: (runId: string, env?: Record<string, string>) => string;
};

describe("maestro runtime config", () => {
  it("builds run-scoped note titles for the canonical failure path", () => {
    expect(buildSmokeNoteTitle("local-123", {})).toBe("fail weekly sync local-123");
    expect(buildSmokeNoteTitle("local-123", { SMOKE_NOTE_TITLE: "fail weekly sync seeded" })).toBe(
      "fail weekly sync seeded",
    );
  });

  it("uses wrapper flow files and artifact directories per platform", () => {
    const config = buildSmokeConfig({
      platform: "android",
      mode: "local",
      env: {
        MAESTRO_OUTPUT_ROOT: ".artifacts/test-smoke",
        SMOKE_RUN_ID: "android-seeded",
      },
    });

    expect(config.flowFile).toBe(path.resolve(".maestro/android-smoke.yaml"));
    expect(config.outputDir).toBe(path.resolve(".artifacts/test-smoke/local/android-android-seeded"));
    expect(config.junitPath).toBe(path.resolve(".artifacts/test-smoke/local/android-android-seeded/android.junit.xml"));
    expect(config.artifactName).toBe("voice-notes-smoke-android");
  });

  it("separates emulator-facing URLs from host health checks", () => {
    const config = buildSmokeConfig({
      platform: "android",
      mode: "ci",
      env: {
        SMOKE_RUN_ID: "ci-android",
      },
    });

    expect(config.apiBaseUrl).toBe("http://10.0.2.2:8000");
    expect(config.hostApiBaseUrl).toBe("http://127.0.0.1:8000");
    expect(config.apiHealthUrl).toBe("http://127.0.0.1:8000/debug/db-dump");
  });

  it("respects explicit iOS overrides without changing the host health probe", () => {
    const config = buildSmokeConfig({
      platform: "ios",
      env: {
        EXPO_PUBLIC_API_BASE_URL_IOS: "http://192.168.0.10:8080/",
        SMOKE_RUN_ID: "ios-seeded",
      },
    });

    expect(config.apiBaseUrl).toBe("http://192.168.0.10:8080");
    expect(config.hostApiBaseUrl).toBe("http://127.0.0.1:8000");
    expect(config.noteTitle).toBe("fail weekly sync ios-seeded");
  });
});
