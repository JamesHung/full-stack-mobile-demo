import { execSync, spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

// --- Android state ---
let androidStartedByUs = false;
let emulatorProcess: ChildProcess | null = null;

// --- iOS state ---
let iosStartedByUs = false;
let iosBootedUdid: string | null = null;

/**
 * Resolve the correct emulator binary path.
 * The `$ANDROID_HOME/emulator/emulator` binary is authoritative;
 * the legacy `$ANDROID_HOME/tools/emulator` is broken on modern SDKs.
 */
export function findEmulatorBinary(): string {
  const home =
    process.env["ANDROID_HOME"] ??
    process.env["ANDROID_SDK_ROOT"] ??
    join(
      process.env["HOME"] ?? "/Users",
      "Library",
      "Android",
      "sdk",
    );
  const binary = join(home, "emulator", "emulator");
  try {
    execSync(`"${binary}" -version`, { stdio: "ignore", timeout: 5000 });
    return binary;
  } catch {
    // Fall back to PATH
    try {
      execSync("emulator -version", { stdio: "ignore", timeout: 5000 });
      return "emulator";
    } catch {
      throw new Error(
        `Android emulator binary not found. Set ANDROID_HOME or ensure emulator is on PATH.`,
      );
    }
  }
}

/** List available AVDs. */
export function listAvds(): string[] {
  const binary = findEmulatorBinary();
  const output = execSync(`"${binary}" -list-avds`, {
    encoding: "utf-8",
    timeout: 10_000,
  }).trim();
  return output ? output.split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

/** Check if any Android device is booted and ready. */
export function isDeviceBooted(): boolean {
  try {
    const output = execSync(
      'adb devices | awk \'NR > 1 && $2 == "device" { print $1 }\'',
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/** Return the serial of the first booted device, or null. */
export function getBootedDeviceSerial(): string | null {
  try {
    const output = execSync(
      'adb devices | awk \'NR > 1 && $2 == "device" { print $1 }\'',
      { encoding: "utf-8", timeout: 5000 },
    ).trim();
    return output ? output.split("\n")[0]!.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Ensure an Android emulator is booted.
 * If one is already running, reuse it.
 * Otherwise start the configured (or first available) AVD and wait for boot.
 */
export async function ensureEmulatorRunning(
  avdName?: string,
  bootTimeout = 120,
  verbose = false,
): Promise<void> {
  if (isDeviceBooted()) {
    if (verbose) console.log("Android device already booted — reusing");
    return;
  }

  const avds = listAvds();
  const avd = avdName ?? avds[0];
  if (!avd) {
    throw new Error("No Android AVDs found. Create one via Android Studio or `avdmanager`.");
  }

  const binary = findEmulatorBinary();
  if (verbose) console.log(`Booting emulator AVD: ${avd}`);

  emulatorProcess = spawn(binary, ["-avd", avd, "-no-audio", "-no-snapshot"], {
    stdio: "ignore",
    detached: true,
  });
  emulatorProcess.unref();
  androidStartedByUs = true;

  // Wait for device to appear and boot_completed
  const deadline = Date.now() + bootTimeout * 1000;
  while (Date.now() < deadline) {
    await sleep(3000);

    if (!isDeviceBooted()) continue;

    // Check boot_completed
    try {
      const prop = execSync("adb shell getprop sys.boot_completed", {
        encoding: "utf-8",
        timeout: 5000,
      }).trim();
      if (prop === "1") {
        if (verbose) console.log("Emulator booted successfully");
        // Extra settle time for launcher
        await sleep(2000);
        return;
      }
    } catch {
      // Not ready yet
    }
  }

  throw new Error(`Emulator failed to boot within ${bootTimeout}s`);
}

/** Stop the emulator if smoke-kit started it. */
export function stopEmulator(verbose = false): void {
  if (!androidStartedByUs) return;

  if (verbose) console.log("Stopping emulator...");

  try {
    execSync("adb emu kill", { stdio: "ignore", timeout: 10_000 });
  } catch {
    // Fallback: kill the process directly
    if (emulatorProcess?.pid) {
      try {
        process.kill(emulatorProcess.pid, "SIGTERM");
      } catch {
        // Already gone
      }
    }
  }

  androidStartedByUs = false;
  emulatorProcess = null;
}

export function wasStartedByUs(): boolean {
  return androidStartedByUs || iosStartedByUs;
}

// ─── iOS Simulator ───────────────────────────────────────────

/** Check if any iOS simulator is booted. */
export function isSimulatorBooted(): boolean {
  try {
    const output = execSync(
      "xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1",
      { encoding: "utf-8", timeout: 10_000 },
    ).trim();
    return output.length > 0;
  } catch {
    return false;
  }
}

/** Return the UDID of the first booted simulator, or null. */
export function getBootedSimulatorUdid(): string | null {
  try {
    const output = execSync(
      "xcrun simctl list devices booted | grep -oE '[A-F0-9-]{36}' | head -1",
      { encoding: "utf-8", timeout: 10_000 },
    ).trim();
    return output || null;
  } catch {
    return null;
  }
}

/**
 * Find the UDID of a simulator by name substring (e.g. "iPhone 17 Pro").
 * Returns the first match from available devices, or null.
 */
export function findSimulatorUdid(nameHint: string): string | null {
  try {
    const output = execSync("xcrun simctl list devices available", {
      encoding: "utf-8",
      timeout: 10_000,
    });
    for (const line of output.split("\n")) {
      if (line.includes(nameHint)) {
        const match = line.match(/\(([A-F0-9-]{36})\)/);
        if (match) return match[1]!;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Return the UDID of the first available iPhone simulator. */
function findFirstAvailableIphone(): string | null {
  try {
    const output = execSync("xcrun simctl list devices available", {
      encoding: "utf-8",
      timeout: 10_000,
    });
    for (const line of output.split("\n")) {
      if (line.includes("iPhone") && line.includes("Shutdown")) {
        const match = line.match(/\(([A-F0-9-]{36})\)/);
        if (match) return match[1]!;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ensure an iOS simulator is booted.
 * If one is already running, reuse it.
 * Otherwise boot the configured (or first available) simulator.
 */
export async function ensureSimulatorRunning(
  udid?: string,
  bootTimeout = 120,
  verbose = false,
): Promise<void> {
  if (isSimulatorBooted()) {
    if (verbose) console.log("iOS simulator already booted — reusing");
    return;
  }

  const targetUdid = udid ?? findFirstAvailableIphone();
  if (!targetUdid) {
    throw new Error("No iOS simulators found. Create one via Xcode or `xcrun simctl create`.");
  }

  if (verbose) console.log(`Booting iOS simulator: ${targetUdid}`);
  execSync(`xcrun simctl boot ${targetUdid}`, { stdio: "ignore", timeout: 30_000 });
  iosStartedByUs = true;
  iosBootedUdid = targetUdid;

  // Wait for simulator to be fully booted
  const deadline = Date.now() + bootTimeout * 1000;
  while (Date.now() < deadline) {
    await sleep(3000);
    if (isSimulatorBooted()) {
      if (verbose) console.log("iOS simulator booted successfully");
      // Open Simulator.app so Maestro can interact with it
      try {
        execSync("open -a Simulator", { stdio: "ignore", timeout: 5000 });
      } catch { /* best effort */ }
      await sleep(3000);
      return;
    }
  }

  throw new Error(`iOS simulator failed to boot within ${bootTimeout}s`);
}

/** Stop the iOS simulator if smoke-kit started it. */
export function stopSimulator(verbose = false): void {
  if (!iosStartedByUs) return;

  if (verbose) console.log("Stopping iOS simulator...");

  try {
    if (iosBootedUdid) {
      execSync(`xcrun simctl shutdown ${iosBootedUdid}`, { stdio: "ignore", timeout: 15_000 });
    } else {
      execSync("xcrun simctl shutdown booted", { stdio: "ignore", timeout: 15_000 });
    }
  } catch {
    // Already shut down
  }

  iosStartedByUs = false;
  iosBootedUdid = null;
}

/**
 * Kill whatever is listening on the given TCP port.
 * Returns true if something was killed (or nothing was there).
 */
export function killProcessOnPort(port: number): boolean {
  try {
    const output = execSync(`lsof -ti :${port} -sTCP:LISTEN`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (!output) return true;

    const pids = output
      .split("\n")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    for (const pid of pids) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Already gone
      }
    }

    // Grace period, then SIGKILL survivors
    if (pids.length > 0) {
      try {
        execSync("sleep 1", { timeout: 3000 });
      } catch { /* */ }
      for (const pid of pids) {
        try {
          process.kill(pid, "SIGKILL");
        } catch {
          // Already gone
        }
      }
    }

    return true;
  } catch {
    // lsof exits non-zero when nothing found — that's fine
    return true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
