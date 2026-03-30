export type Platform = "android" | "ios";

export interface PlatformDefaults {
  runnerOs: string;
  deviceDetectionCommand: string;
  apiBaseUrl: string;
}

export const platformDefaults: Record<Platform, PlatformDefaults> = {
  android: {
    runnerOs: "ubuntu-latest",
    deviceDetectionCommand:
      "adb devices | awk 'NR > 1 && $2 == \"device\" { print $1; exit }'",
    apiBaseUrl: "http://10.0.2.2:8000",
  },
  ios: {
    runnerOs: "macos-latest",
    deviceDetectionCommand:
      "xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1",
    apiBaseUrl: "http://127.0.0.1:8000",
  },
};

export function isPlatform(value: string): value is Platform {
  return value === "android" || value === "ios";
}

export function generateRunId(ciRunId?: string): string {
  if (ciRunId) return ciRunId;
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${ts}-${rand}`;
}
