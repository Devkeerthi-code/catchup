import { z } from "zod";

/**
 * Two layers: `modelChunkSchema` is the loose shape Gemini is asked to fill (JSON Schema without
 * regexes, which the API handles poorly); `cleanChunkSummary` then validates every item strictly
 * and drops anything malformed or citing messages that weren't in the chunk.
 */

const nullableString = z.string().nullable();
const ids = z.array(z.string());

export const modelChunkSchema = z.object({
  highlights: z.array(z.object({ text: z.string(), sourceIds: ids })),
  decisions: z.array(z.object({ text: z.string(), sourceIds: ids })),
  deadlines: z.array(
    z.object({ title: z.string(), date: nullableString, time: nullableString, place: nullableString, sourceIds: ids }),
  ),
  openQuestions: z.array(z.object({ question: z.string(), askedBy: nullableString, sourceIds: ids })),
  files: z.array(z.object({ name: z.string(), sourceIds: ids })),
  polls: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.object({ text: z.string(), votes: z.number().nullable() })),
      result: nullableString,
      sourceIds: ids,
    }),
  ),
});

export const modelTldrSchema = z.object({
  lines: z.array(z.object({ text: z.string(), itemIds: z.array(z.string()) })),
});

const messageId = z.string().regex(/^m\d{1,7}$/);
const sourceIds = z.array(messageId).min(1).max(30);
const shortText = (max: number) => z.string().trim().min(1).transform((s) => s.slice(0, max));
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .nullable()
    .transform((s) => (s ? s.slice(0, max) : null));

export const highlightSchema = z.object({ text: shortText(240), sourceIds });
export const decisionSchema = z.object({ text: shortText(240), sourceIds });
export const deadlineSchema = z.object({
  title: shortText(160),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().catch(null),
  place: optionalText(120),
  sourceIds,
});
export const questionSchema = z.object({
  question: shortText(240),
  askedBy: z.string().regex(/^Member \d{1,5}$/).nullable().catch(null),
  sourceIds,
});
export const fileSchema = z.object({ name: shortText(160), sourceIds });
export const pollSchema = z.object({
  question: shortText(200),
  options: z
    .array(z.object({ text: shortText(120), votes: z.number().int().min(0).max(100_000).nullable().catch(null) }))
    .max(12),
  result: optionalText(160),
  sourceIds,
});

export const chunkSummarySchema = z.object({
  highlights: z.array(highlightSchema).max(20),
  decisions: z.array(decisionSchema).max(30),
  deadlines: z.array(deadlineSchema).max(30),
  openQuestions: z.array(questionSchema).max(20),
  files: z.array(fileSchema).max(30),
  polls: z.array(pollSchema).max(15),
});
export type ChunkSummary = z.infer<typeof chunkSummarySchema>;

export const EMPTY_CHUNK_SUMMARY: ChunkSummary = {
  highlights: [], decisions: [], deadlines: [], openQuestions: [], files: [], polls: [],
};

const LIST_LIMITS: Record<keyof ChunkSummary, number> = {
  highlights: 20, decisions: 30, deadlines: 30, openQuestions: 20, files: 30, polls: 15,
};

const ITEM_SCHEMAS = {
  highlights: highlightSchema,
  decisions: decisionSchema,
  deadlines: deadlineSchema,
  openQuestions: questionSchema,
  files: fileSchema,
  polls: pollSchema,
} as const;

/**
 * Keeps only well-formed items whose citations point at messages the model was actually shown
 * (and were not context-only). Hallucinated or injected items without real sources are dropped.
 */
export function cleanChunkSummary(raw: unknown, allowedIds: ReadonlySet<string>): ChunkSummary {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: ChunkSummary = structuredClone(EMPTY_CHUNK_SUMMARY);
  for (const key of Object.keys(ITEM_SCHEMAS) as (keyof ChunkSummary)[]) {
    const list = Array.isArray(input[key]) ? (input[key] as unknown[]) : [];
    const schema = ITEM_SCHEMAS[key];
    const items: unknown[] = [];
    for (const candidate of list) {
      if (candidate && typeof candidate === "object" && Array.isArray((candidate as { sourceIds?: unknown }).sourceIds)) {
        const cited = (candidate as { sourceIds: unknown[] }).sourceIds.filter(
          (id): id is string => typeof id === "string" && allowedIds.has(id),
        );
        const parsed = schema.safeParse({ ...candidate, sourceIds: [...new Set(cited)] });
        if (parsed.success) items.push(parsed.data);
      }
      if (items.length >= LIST_LIMITS[key]) break;
    }
    (out[key] as unknown[]) = items;
  }
  return out;
}

export const tldrLineSchema = z.object({ text: shortText(200), itemIds: z.array(z.string().max(12)).max(10) });
