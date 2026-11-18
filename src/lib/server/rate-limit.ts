import "server-only";
import { createHash } from "node:crypto";
import { db } from "./db";
import { env } from "./env";

export interface Limit {
  /** Bucket name, e.g. "ai:ip:<hash>" or "gemini:minute". */
  key: string;
  max: number;
  windowMs: number;
}

export interface LimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/** IPs are never stored: only a salted hash, which can't be turned back into the address. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(`${env().HASH_SALT}:${ip}`).digest("base64url").slice(0, 22);
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "local";
}

/**
 * Fixed-window counter in Postgres, so every serverless instance shares one count.
 * The upsert is a single atomic statement; no read-then-write race.
 */
async function hit(limit: Limit, now: number): Promise<LimitResult> {
  const windowStart = new Date(Math.floor(now / limit.windowMs) * limit.windowMs);
  const rows = await db().$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitWindow" ("key", "windowStart", "count")
    VALUES (${limit.key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimitWindow"."count" + 1
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 0);
  const retryAfterSeconds = Math.ceil((windowStart.getTime() + limit.windowMs - now) / 1000);
  return { ok: count <= limit.max, retryAfterSeconds };
}

/** Checks every limit; the request is allowed only if all of them have room. */
export async function consume(limits: Limit[], now = Date.now()): Promise<LimitResult> {
  const results = await Promise.all(limits.map((l) => hit(l, now)));
  const blocked = results.filter((r) => !r.ok);
  if (!blocked.length) return { ok: true, retryAfterSeconds: 0 };
  return { ok: false, retryAfterSeconds: Math.max(...blocked.map((r) => r.retryAfterSeconds)) };
}

const HOUR = 3_600_000;

/** Per-visitor hourly cap plus the global per-minute and per-day caps of the free Gemini tier. */
export function aiLimits(request: Request, weight: "chunk" | "screenshot" = "chunk"): Limit[] {
  const e = env();
  const ip = hashIp(clientIp(request));
  const perIp = weight === "screenshot" ? Math.max(1, Math.floor(e.AI_CALLS_PER_IP_PER_HOUR / 4)) : e.AI_CALLS_PER_IP_PER_HOUR;
  return [
    { key: `ai:${weight}:${ip}`, max: perIp, windowMs: HOUR },
    { key: "gemini:minute", max: e.GEMINI_CALLS_PER_MINUTE, windowMs: 60_000 },
    { key: "gemini:day", max: e.GEMINI_CALLS_PER_DAY, windowMs: 24 * HOUR },
  ];
}

export function authLimits(request: Request): Limit[] {
  return [{ key: `auth:${hashIp(clientIp(request))}`, max: 10, windowMs: 15 * 60_000 }];
}

/** Old windows are useless; delete them occasionally instead of running a cron job. */
export async function pruneOldWindows(now = Date.now()): Promise<void> {
  if (Math.random() > 0.02) return;
  await db().rateLimitWindow.deleteMany({ where: { windowStart: { lt: new Date(now - 2 * 24 * HOUR) } } });
}
