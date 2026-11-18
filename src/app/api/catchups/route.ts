import { z } from "zod";
import { catchUpSchema } from "@/lib/summary/catchup-schema";
import { db } from "@/lib/server/db";
import { isSameOrigin, jsonError, readJson } from "@/lib/server/http";
import { readSession } from "@/lib/server/session";
import { track } from "@/lib/server/usage";

const MAX_SAVED = 200;

/** The signed-in user's saved catch-ups, newest first (summary metadata only). */
export async function GET(): Promise<Response> {
  const session = await readSession();
  if (!session) return jsonError(401, "Log in to see saved catch-ups.");
  const rows = await db().savedCatchup.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: MAX_SAVED,
    select: { id: true, title: true, source: true, rangeStart: true, rangeEnd: true, messageCount: true, itemCount: true, createdAt: true },
  });
  return Response.json({ catchups: rows }, { headers: { "Cache-Control": "no-store" } });
}

const saveSchema = z.object({ catchup: catchUpSchema });

/** Saves a summary. Idempotent: saving the same catch-up twice returns the first copy. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const session = await readSession();
  if (!session) return jsonError(401, "Log in to save catch-ups.");
  const body = await readJson(request, saveSchema, 300_000);
  if ("response" in body) return body.response;

  const { catchup } = body.data;
  const where = { userId_clientId: { userId: session.userId, clientId: catchup.id } };
  const existing = await db().savedCatchup.findUnique({ where, select: { id: true } });
  if (existing) return Response.json({ id: existing.id, created: false });

  const count = await db().savedCatchup.count({ where: { userId: session.userId } });
  if (count >= MAX_SAVED) return jsonError(409, `You can keep up to ${MAX_SAVED} catch-ups. Delete some old ones first.`);

  const itemCount = catchup.decisions.length + catchup.deadlines.length + catchup.links.length + catchup.files.length + catchup.questions.length + catchup.polls.length;
  const saved = await db().savedCatchup.upsert({
    where,
    update: {},
    create: {
      clientId: catchup.id,
      userId: session.userId,
      title: catchup.title,
      source: catchup.source,
      rangeStart: new Date(catchup.range.from),
      rangeEnd: new Date(catchup.range.to),
      messageCount: catchup.stats.messagesRead,
      itemCount,
      summary: catchup,
    },
    select: { id: true },
  });
  await track("catchup_saved");
  return Response.json({ id: saved.id, created: true }, { status: 201 });
}
