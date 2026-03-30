import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export interface TrackedProcess {
  pid: number;
  name: string;
  logFile: string;
  process: ChildProcess;
}

const registry: TrackedProcess[] = [];

export function getRegistry(): readonly TrackedProcess[] {
  return registry;
}

export function clearRegistry(): void {
  registry.length = 0;
}

export async function startService(
  name: string,
  command: string,
  logFile: string,
  env?: Record<string, string>,
): Promise<TrackedProcess> {
  await mkdir(dirname(logFile), { recursive: true });
  const logStream = createWriteStream(logFile, { flags: "a" });

  const child = spawn("sh", ["-c", command], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: { ...process.env, ...env },
  });

  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  if (!child.pid) {
    throw new Error(`Failed to start service: ${name}`);
  }

  const tracked: TrackedProcess = {
    pid: child.pid,
    name,
    logFile,
    process: child,
  };

  registry.push(tracked);

  // Detect early exit
  child.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`Service "${name}" exited with code ${code}`);
    }
  });

  return tracked;
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
