import "server-only";
import { z } from "zod";

const int = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const schema = z.object({
  DATABASE_URL: z.string().url(),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash"),
  GEMINI_FALLBACK_MODEL: z.string().default("gemini-3.1-flash-lite"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  HASH_SALT: z.string().min(16, "HASH_SALT must be at least 16 characters"),
  ADMIN_EMAILS: z.string().default(""),
  AI_CALLS_PER_IP_PER_HOUR: int(60),
  GEMINI_CALLS_PER_MINUTE: int(10),
  GEMINI_CALLS_PER_DAY: int(800),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server env. Throws one clear message listing every missing or invalid variable. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment variables (see .env.example). ${problems}`);
  }
  cached = parsed.data;
  return cached;
}

export function adminEmails(): Set<string> {
  return new Set(
    env()
      .ADMIN_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}
