import { execSync, spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

let startedByUs = false;
let emulatorProcess: ChildProcess | null = null;

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
  startedByUs = true;

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
  if (!startedByUs) return;

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

  startedByUs = false;
  emulatorProcess = null;
}

export function wasStartedByUs(): boolean {
  return startedByUs;
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
