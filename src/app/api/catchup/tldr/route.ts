import { z } from "zod";
import { maskSensitive } from "@/lib/privacy/mask";
import { buildTldrPrompt, TLDR_SYSTEM_INSTRUCTION } from "@/lib/summary/prompt";
import { modelTldrSchema, tldrLineSchema } from "@/lib/summary/schema";
import { AiUnavailableError, generateJson } from "@/lib/server/gemini";
import { isSameOrigin, jsonError, rateLimited, readJson } from "@/lib/server/http";
import { aiLimits, consume } from "@/lib/server/rate-limit";

export const maxDuration = 30;

const bodySchema = z.object({
  items: z
    .array(z.object({ id: z.string().regex(/^[a-z]\d{1,4}$/), type: z.string().max(20), text: z.string().max(400) }))
    .min(1)
    .max(80),
});

/** Reduce step: five TL;DR lines written from the merged items (no chat text is sent here). */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const body = await readJson(request, bodySchema, 60_000);
  if ("response" in body) return body.response;

  const limit = await consume(aiLimits(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  const items = body.data.items.map((item) => ({ ...item, text: maskSensitive(item.text) }));
  const known = new Set(items.map((i) => i.id));
  try {
    const raw = await generateJson({
      system: TLDR_SYSTEM_INSTRUCTION,
      parts: [{ text: buildTldrPrompt(items) }],
      schema: modelTldrSchema,
      maxOutputTokens: 1024,
      timeoutMs: 25_000,
    });
    const candidates = modelTldrSchema.safeParse(raw);
    const lines = (candidates.success ? candidates.data.lines : [])
      .map((line) => tldrLineSchema.safeParse({ ...line, itemIds: line.itemIds.filter((id) => known.has(id)) }))
      .flatMap((r) => (r.success && r.data.itemIds.length ? [r.data] : []))
      .slice(0, 5);
    return Response.json({ lines }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return error.status === 429 ? rateLimited(error.retryAfterSeconds) : jsonError(error.status, error.message);
    }
    throw error;
  }
}
