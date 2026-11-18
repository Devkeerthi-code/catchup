import type { UsageAction } from "../usage";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfterSeconds = 0,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const OFFLINE = "You seem to be offline. Check your connection and try again.";

/** fetch + JSON with one consistent error type whose message is safe to show the user. */
export async function apiFetch<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      headers: json === undefined ? headers : { "Content-Type": "application/json", ...headers },
      body: json === undefined ? rest.body : JSON.stringify(json),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError(OFFLINE, 0);
  }
  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => null)) as ({ error?: string; retryAfterSeconds?: number } & T) | null;
  if (!response.ok) {
    const message = body?.error ?? (response.status >= 500 ? "CatchUp's server had a problem. Try again in a moment." : "That didn't work. Try again.");
    throw new ApiClientError(message, response.status, body?.retryAfterSeconds ?? Number(response.headers.get("Retry-After") ?? 0));
  }
  return body as T;
}

/** Fire-and-forget anonymous count. Never throws, never blocks the UI. */
export function trackUsage(action: UsageAction): void {
  void apiFetch("/api/usage", { method: "POST", json: { action }, keepalive: true }).catch(() => undefined);
}

const VISITOR_KEY = "catchup:counted-visitor";

/** Counts each browser once, without an id: a flag in localStorage says "already counted". */
export function trackVisitorOnce(): void {
  try {
    if (localStorage.getItem(VISITOR_KEY)) return;
    localStorage.setItem(VISITOR_KEY, "1");
  } catch {
    return;
  }
  trackUsage("visitor");
}
