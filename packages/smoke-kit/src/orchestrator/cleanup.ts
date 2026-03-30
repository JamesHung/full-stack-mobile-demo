import { getRegistry, clearRegistry } from "./service-manager.js";

let cleanupRegistered = false;

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

  for (const svc of services) {
    try {
      // Kill the process group
      process.kill(-svc.pid, "SIGTERM");
    } catch {
      try {
        process.kill(svc.pid, "SIGTERM");
      } catch {
        // Process already gone
      }
    }
  }

  // Give 3 seconds, then SIGKILL survivors
  setTimeout(() => {
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
  }, 3000);

  clearRegistry();
}
