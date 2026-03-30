export interface HttpProbeOptions {
  url: string;
  timeout?: number;
  retryInterval?: number;
  method?: "GET" | "HEAD";
}

export async function httpProbe(options: HttpProbeOptions): Promise<boolean> {
  const timeout = (options.timeout ?? 60) * 1000;
  const interval = (options.retryInterval ?? 2) * 1000;
  const method = options.method ?? "GET";
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const reqTimeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(options.url, {
        method,
        signal: controller.signal,
      });
      clearTimeout(reqTimeout);

      if (res.ok) return true;

      // Retry on 5xx, fail on 4xx
      if (res.status < 500) return false;
    } catch {
      // Connection refused, timeout, etc. — retry
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await new Promise((r) => setTimeout(r, Math.min(interval, remaining)));
  }

  return false;
}
