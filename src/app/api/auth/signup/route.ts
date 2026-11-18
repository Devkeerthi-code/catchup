import { Prisma } from "@/generated/prisma/client";
import { credentialsSchema, hashPassword } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { isSameOrigin, jsonError, rateLimited, readJson } from "@/lib/server/http";
import { authLimits, consume } from "@/lib/server/rate-limit";
import { createSession } from "@/lib/server/session";
import { track } from "@/lib/server/usage";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const body = await readJson(request, credentialsSchema, 4_000);
  if ("response" in body) return body.response;

  const limit = await consume(authLimits(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const { email, password } = body.data;
  try {
    const user = await db().user.create({ data: { email, passwordHash: await hashPassword(password) } });
    await createSession({ userId: user.id, email: user.email });
    await track("account_created");
    return Response.json({ user: { email: user.email } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError(409, "An account with this email already exists. Log in instead.");
    }
    throw error;
  }
}
