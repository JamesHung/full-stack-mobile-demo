const path = require("node:path");

const DEFAULT_APP_ID = "com.demo.voicenotes";
const DEFAULT_OUTPUT_ROOT = ".artifacts/maestro";
const DEFAULT_METRO_PORT = "8081";

function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function normalizePlatform(platform) {
  if (platform === "android" || platform === "ios" || platform === "web") {
    return platform;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

function normalizeUrl(url) {
  return url.replace(/\/+$/, "");
}

function resolveApiBaseUrl(platform, env = process.env) {
  const normalizedPlatform = normalizePlatform(platform);
  const genericOverride = env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const platformOverride =
    normalizedPlatform === "android"
      ? env.EXPO_PUBLIC_API_BASE_URL_ANDROID?.trim()
      : normalizedPlatform === "ios"
        ? env.EXPO_PUBLIC_API_BASE_URL_IOS?.trim()
        : undefined;

  if (platformOverride) {
    return normalizeUrl(platformOverride);
  }

  if (genericOverride) {
    return normalizeUrl(genericOverride);
  }

  if (normalizedPlatform === "android") {
    return "http://10.0.2.2:8000";
  }

  if (normalizedPlatform === "ios") {
    return "http://127.0.0.1:8000";
  }

  return "http://localhost:8000";
}

function createRunId(env = process.env) {
  if (env.SMOKE_RUN_ID?.trim()) {
    return env.SMOKE_RUN_ID.trim();
  }

  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const random = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${random}`;
}

function buildSmokeNoteTitle(runId, env = process.env) {
  if (env.SMOKE_NOTE_TITLE?.trim()) {
    return env.SMOKE_NOTE_TITLE.trim();
  }

  return `fail weekly sync ${runId}`;
}

function buildSmokeConfig({ platform, mode = "local", env = process.env }) {
  const normalizedPlatform = normalizePlatform(platform);
  const currentRepoRoot = repoRoot();
  const runId = createRunId(env);
  const outputRoot = path.resolve(currentRepoRoot, env.MAESTRO_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT);
  const outputDir = path.join(outputRoot, mode, `${normalizedPlatform}-${runId}`);
  const logsDir = path.join(outputDir, "logs");
  const debugOutputDir = path.join(outputDir, "debug");
  const testOutputDir = path.join(outputDir, "maestro-output");
  const deviceId = env.MAESTRO_DEVICE_ID?.trim() || "";
  const androidApiBaseUrl = resolveApiBaseUrl("android", env);
  const iosApiBaseUrl = resolveApiBaseUrl("ios", env);
  const apiBaseUrl = normalizedPlatform === "android" ? androidApiBaseUrl : iosApiBaseUrl;

  return {
    repoRoot: currentRepoRoot,
    mode,
    platform: normalizedPlatform,
    platformLabel: normalizedPlatform === "android" ? "Android" : "iOS",
    runId,
    appId: env.MAESTRO_APP_ID?.trim() || DEFAULT_APP_ID,
    deviceId,
    outputRoot,
    outputDir,
    artifactName: `voice-notes-smoke-${normalizedPlatform}`,
    flowFile: path.join(currentRepoRoot, ".maestro", `${normalizedPlatform}-smoke.yaml`),
    canonicalFlowFile: path.join(currentRepoRoot, ".maestro", "voice-notes-smoke.yaml"),
    junitPath: path.join(outputDir, `${normalizedPlatform}.junit.xml`),
    testOutputDir,
    debugOutputDir,
    logsDir,
    maestroLogPath: path.join(logsDir, "maestro.log"),
    apiLogPath: path.join(logsDir, "api.log"),
    workerLogPath: path.join(logsDir, "worker.log"),
    metroLogPath: path.join(logsDir, "metro.log"),
    buildLogPath: path.join(logsDir, "build-install.log"),
    summaryPath: path.join(outputDir, "summary.txt"),
    apiBaseUrl,
    hostApiBaseUrl: "http://127.0.0.1:8000",
    androidApiBaseUrl,
    iosApiBaseUrl,
    apiHealthUrl: "http://127.0.0.1:8000/debug/db-dump",
    noteTitle: buildSmokeNoteTitle(runId, env),
    metroHost: "127.0.0.1",
    metroPort: env.EXPO_DEV_SERVER_PORT?.trim() || DEFAULT_METRO_PORT,
  };
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function renderShell(config) {
  return Object.entries(config)
    .map(([key, value]) => `export SMOKE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}=${shellQuote(value)}`)
    .join("\n");
}

function parseArgs(argv) {
  let platform = "";
  let mode = "local";
  let format = "json";

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--platform") {
      platform = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (token === "--mode") {
      mode = argv[index + 1] || mode;
      index += 1;
      continue;
    }

    if (token === "--format") {
      format = argv[index + 1] || format;
      index += 1;
      continue;
    }
  }

  if (!platform) {
    throw new Error("Missing --platform");
  }

  if (mode !== "local" && mode !== "ci") {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  if (format !== "json" && format !== "shell") {
    throw new Error(`Unsupported format: ${format}`);
  }

  return { platform, mode, format };
}

if (require.main === module) {
  const options = parseArgs(process.argv.slice(2));
  const config = buildSmokeConfig(options);
  process.stdout.write(options.format === "shell" ? renderShell(config) : JSON.stringify(config, null, 2));
  process.stdout.write("\n");
}

module.exports = {
  DEFAULT_APP_ID,
  buildSmokeConfig,
  buildSmokeNoteTitle,
  createRunId,
  normalizePlatform,
  resolveApiBaseUrl,
};
