import { db } from "@/lib/server/db";
import { isSameOrigin, jsonError } from "@/lib/server/http";
import { readSession } from "@/lib/server/session";

function validId(id: string): boolean {
  return /^[a-z0-9]{20,40}$/.test(id);
}

export async function GET(_request: Request, ctx: RouteContext<"/api/catchups/[id]">): Promise<Response> {
  const session = await readSession();
  if (!session) return jsonError(401, "Log in to open saved catch-ups.");
  const { id } = await ctx.params;
  if (!validId(id)) return jsonError(404, "That catch-up doesn't exist.");
  // Scoped by userId: another account's id simply isn't found.
  const row = await db().savedCatchup.findFirst({ where: { id, userId: session.userId }, select: { id: true, summary: true } });
  if (!row) return jsonError(404, "That catch-up doesn't exist.");
  return Response.json({ id: row.id, catchup: row.summary }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/catchups/[id]">): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const session = await readSession();
  if (!session) return jsonError(401, "Log in to delete catch-ups.");
  const { id } = await ctx.params;
  if (!validId(id)) return jsonError(404, "That catch-up doesn't exist.");
  const { count } = await db().savedCatchup.deleteMany({ where: { id, userId: session.userId } });
  if (!count) return jsonError(404, "That catch-up doesn't exist.");
  return Response.json({ ok: true });
}
