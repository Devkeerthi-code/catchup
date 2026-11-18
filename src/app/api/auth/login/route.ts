import { z } from "zod";
import { verifyPassword } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isSameOrigin, jsonError, rateLimited, readJson } from "@/lib/server/http";
import { authLimits, consume } from "@/lib/server/rate-limit";
import { createSession } from "@/lib/server/session";

// Login doesn't re-check password rules: old accounts must still be able to sign in.
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const body = await readJson(request, loginSchema, 4_000);
  if ("response" in body) return body.response;

  const limit = await consume(authLimits(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const { email, password } = body.data;
  const user = await db().user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !valid) return jsonError(401, "That email and password don't match.");

  await createSession({ userId: user.id, email: user.email });
  return Response.json({ user: { email: user.email } });
}
