import { getApiBaseUrl } from "./baseUrl";

export interface ApiClientOptions {
  baseUrl?: string;
  accessToken?: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
  }
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions = {}) {}

  async request<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    if (this.options.accessToken) {
      headers.set("Authorization", `Bearer ${this.options.accessToken}`);
    }

    const response = await fetch(`${this.options.baseUrl ?? getApiBaseUrl()}${path}`, {
      ...init,
      headers,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new ApiError(
        typeof payload?.detail === "string" ? payload.detail : "Request failed.",
        response.status,
        payload,
      );
    }

    return payload as TResponse;
  }
}

export function createJsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
