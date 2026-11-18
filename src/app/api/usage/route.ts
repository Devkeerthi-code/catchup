import { z } from "zod";
import { usageActionSchema } from "@/lib/usage";
import { isSameOrigin, jsonError, readJson } from "@/lib/server/http";
import { clientIp, consume, hashIp } from "@/lib/server/rate-limit";
import { track } from "@/lib/server/usage";

const bodySchema = z.object({ action: usageActionSchema });

/** Counts one anonymous action. Capped per visitor so the counts can't be inflated by a script. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const body = await readJson(request, bodySchema, 1_000);
  if ("response" in body) return body.response;
  const limit = await consume([{ key: `usage:${hashIp(clientIp(request))}`, max: 120, windowMs: 3_600_000 }]);
  if (limit.ok) await track(body.data.action);
  return new Response(null, { status: 204 });
}
