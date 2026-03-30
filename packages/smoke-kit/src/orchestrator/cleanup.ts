import { getRegistry, clearRegistry } from "./service-manager.js";
import { stopEmulator, wasStartedByUs } from "./emulator-manager.js";
import { execSync } from "node:child_process";

let cleanupRegistered = false;
let verboseCleanup = false;

export function setCleanupVerbose(v: boolean): void {
  verboseCleanup = v;
}

export function registerCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;

  const doCleanup = () => {
    killAllServices();
  };

  process.on("exit", doCleanup);
  process.on("SIGINT", () => {
    doCleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    doCleanup();
    process.exit(143);
  });
}

export function killAllServices(): void {
  const services = [...getRegistry()].reverse();

  // SIGTERM all services
  for (const svc of services) {
    try {
      process.kill(-svc.pid, "SIGTERM");
    } catch {
      try {
        process.kill(svc.pid, "SIGTERM");
      } catch {
        // Process already gone
      }
    }
  }

  // Synchronous grace period then SIGKILL survivors
  if (services.length > 0) {
    try {
      execSync("sleep 2", { stdio: "ignore", timeout: 5000 });
    } catch { /* */ }

    for (const svc of services) {
      try {
        process.kill(-svc.pid, "SIGKILL");
      } catch {
        try {
          process.kill(svc.pid, "SIGKILL");
        } catch {
          // Already gone
        }
      }
    }
  }

  clearRegistry();

  // Stop emulator if we started it
  if (wasStartedByUs()) {
    stopEmulator(verboseCleanup);
  }
}
