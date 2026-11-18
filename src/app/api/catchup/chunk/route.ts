import { z } from "zod";
import { maskSensitive } from "@/lib/privacy/mask";
import { citableIds, MAX_CHUNKS_PER_RUN, payloadMessageSchema } from "@/lib/summary/chunk";
import { buildChunkPrompt, CHUNK_SYSTEM_INSTRUCTION } from "@/lib/summary/prompt";
import { cleanChunkSummary, modelChunkSchema } from "@/lib/summary/schema";
import { AiUnavailableError, generateJson } from "@/lib/server/gemini";
import { isSameOrigin, jsonError, rateLimited, readJson } from "@/lib/server/http";
import { aiLimits, consume, pruneOldWindows } from "@/lib/server/rate-limit";

export const maxDuration = 60;

const bodySchema = z.object({
  index: z.number().int().min(0).max(MAX_CHUNKS_PER_RUN - 1),
  total: z.number().int().min(1).max(MAX_CHUNKS_PER_RUN),
  messages: z.array(payloadMessageSchema).min(1).max(4000),
});

/** Map step: one time-ordered chunk of pseudonymised messages in, one validated summary out. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  const body = await readJson(request, bodySchema, 400_000);
  if ("response" in body) return body.response;
  const { index, total, messages } = body.data;
  if (index >= total) return jsonError(422, "The part number must be smaller than the number of parts.");

  const limit = await consume(aiLimits(request));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);
  void pruneOldWindows();

  // Defence in depth: mask again on the server in case a modified client skipped it.
  const safe = messages.map((m) => ({ ...m, x: maskSensitive(m.x) }));
  try {
    const raw = await generateJson({
      system: CHUNK_SYSTEM_INSTRUCTION,
      parts: [{ text: buildChunkPrompt(safe, index, total) }],
      schema: modelChunkSchema,
      maxOutputTokens: 8192,
      timeoutMs: 50_000,
    });
    return Response.json({ summary: cleanChunkSummary(raw, citableIds({ messages: safe })) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return error.status === 429 ? rateLimited(error.retryAfterSeconds) : jsonError(error.status, error.message, { retryAfterSeconds: error.retryAfterSeconds || undefined });
    }
    throw error;
  }
}
