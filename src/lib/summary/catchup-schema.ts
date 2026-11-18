import { z } from "zod";

/**
 * Server-side check of a catch-up a user wants to save. It accepts only the summary shape:
 * short item texts and message ids. There is no field that could carry the chat itself.
 */
const text = (max: number) => z.string().max(max);
const ids = z.array(z.string().regex(/^m\d{1,7}$/)).max(60);
const base = { id: z.string().regex(/^[a-z]\d{1,4}$/), sourceIds: ids, at: z.number().finite() };
const source = z.enum(["whatsapp", "telegram", "slack", "discord", "meta", "plaintext", "screenshot"]);

export const catchUpSchema = z.object({
  version: z.literal(1),
  id: z.string().uuid(),
  title: text(120),
  source,
  formatLabel: text(120),
  createdAt: z.number().finite(),
  range: z.object({ from: z.number().finite(), to: z.number().finite() }),
  stats: z.object({
    messagesRead: z.number().int().min(0),
    noiseRemoved: z.number().int().min(0),
    minutesSaved: z.number().int().min(0),
    signalItems: z.number().int().min(0),
  }),
  tldr: z.array(z.object({ text: text(240), sourceIds: ids })).max(5),
  decisions: z.array(z.object({ ...base, type: z.literal("decision"), text: text(240) })).max(60),
  deadlines: z
    .array(
      z.object({
        ...base,
        type: z.literal("deadline"),
        title: text(160),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        time: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
        place: text(120).nullable(),
        changes: z.array(text(400)).max(6),
      }),
    )
    .max(60),
  links: z
    .array(z.object({ ...base, type: z.literal("link"), url: z.string().url().max(2048), domain: text(253), shares: z.number().int().min(1) }))
    .max(200),
  files: z.array(z.object({ ...base, type: z.literal("file"), name: text(160) })).max(100),
  questions: z
    .array(z.object({ ...base, type: z.literal("question"), question: text(240), askedBy: text(20).nullable() }))
    .max(40),
  polls: z
    .array(
      z.object({
        ...base,
        type: z.literal("poll"),
        question: text(200),
        options: z.array(z.object({ text: text(120), votes: z.number().int().min(0).nullable() })).max(12),
        result: text(160).nullable(),
        closed: z.boolean(),
      }),
    )
    .max(30),
  insights: z.object({
    totalMessages: z.number().int().min(0),
    noiseMessages: z.number().int().min(0),
    hours: z.array(z.number().int().min(0)).length(24),
    days: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), count: z.number().int().min(0) })).max(400),
    members: z.array(z.object({ name: z.string().regex(/^Member \d{1,5}$/), count: z.number().int().min(0) })).max(10),
    domains: z.array(z.object({ domain: text(253), count: z.number().int().min(0) })).max(10),
    timeQuality: z.enum(["exact", "estimated"]),
  }),
  warnings: z.array(text(300)).max(10),
});
