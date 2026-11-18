import "server-only";
import type { z } from "zod";

export interface ApiErrorBody {
  error: string;
  retryAfterSeconds?: number;
}

export function jsonError(status: number, error: string, extra: Omit<ApiErrorBody, "error"> = {}): Response {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (extra.retryAfterSeconds) headers["Retry-After"] = String(extra.retryAfterSeconds);
  return Response.json({ error, ...extra } satisfies ApiErrorBody, { status, headers });
}

export function rateLimited(retryAfterSeconds: number): Response {
  const wait = retryAfterSeconds > 90 ? `${Math.ceil(retryAfterSeconds / 60)} minutes` : `${retryAfterSeconds} seconds`;
  return jsonError(429, `CatchUp is busy (free AI quota). Try again in ${wait}.`, { retryAfterSeconds });
}

/**
 * Blocks cross-site form posts and fetches. Browsers always send Origin on POST/DELETE, so a
 * request from another site (or without the header from a browser) is refused.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Reads and validates a JSON body with a size cap. Returns a ready error Response on failure. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes: number,
): Promise<{ data: z.infer<T> } | { response: Response }> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return { response: jsonError(413, "That request is too large. Pick a shorter range.") };
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { response: jsonError(400, "The request couldn't be read.") };
  }
  if (new TextEncoder().encode(raw).length > maxBytes) {
    return { response: jsonError(413, "That request is too large. Pick a shorter range.") };
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { response: jsonError(400, "The request wasn't valid JSON.") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    // Schemas carry human messages ("Enter a valid email address."), so show the first as is.
    return { response: jsonError(422, parsed.error.issues[0]?.message ?? "That request wasn't valid.") };
  }
  return { data: parsed.data };
}
