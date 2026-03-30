import { createConnection } from "node:net";

export interface TcpProbeOptions {
  port: number;
  host?: string;
  timeout?: number;
  retryInterval?: number;
}

function tryConnect(
  port: number,
  host: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.setTimeout(3000, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

export async function tcpProbe(options: TcpProbeOptions): Promise<boolean> {
  const host = options.host ?? "127.0.0.1";
  const timeout = (options.timeout ?? 60) * 1000;
  const interval = (options.retryInterval ?? 2) * 1000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const connected = await tryConnect(options.port, host);
    if (connected) return true;

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(interval, remaining)));
  }

  return false;
}
