import { isSameOrigin, jsonError } from "@/lib/server/http";
import { clearSession } from "@/lib/server/session";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  await clearSession();
  return Response.json({ ok: true });
}
