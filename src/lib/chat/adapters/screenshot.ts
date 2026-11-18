import { z } from "zod";
import { finalizeMessages, type DraftMessage } from "../finalize";
import type { ParsedChat } from "../types";

/** Loose shape requested from Gemini vision for each visible message bubble. */
export const modelTranscriptSchema = z.object({
  messages: z.array(
    z.object({ author: z.string().nullable(), date: z.string().nullable(), time: z.string().nullable(), text: z.string(), system: z.boolean() }),
  ),
});

/** Strict check of the reply: malformed dates or times become null instead of failing the import. */
export const transcriptLineSchema = z.object({
  author: z.string().trim().max(80).nullable().catch(null),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().catch(null),
  time: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/).nullable().catch(null),
  text: z.string().max(4000),
  system: z.boolean().catch(false),
});
export const transcriptSchema = z.object({ messages: z.array(transcriptLineSchema).max(400) });
export type Transcript = z.infer<typeof transcriptSchema>;

export function chatFromTranscript(transcript: Transcript, now = Date.now()): ParsedChat {
  const today = new Date(now);
  const count = transcript.messages.length;
  let lastTime = Number.NEGATIVE_INFINITY;
  const drafts: DraftMessage[] = transcript.messages.map((line, i) => {
    let time = Number.isFinite(lastTime) ? lastTime + 60_000 : now - (count - i) * 60_000;
    if (line.time) {
      const [h, m] = line.time.split(":").map(Number);
      const base = line.date ? new Date(`${line.date}T00:00:00`) : new Date(today.getFullYear(), today.getMonth(), today.getDate());
      time = base.getTime() + (h * 60 + m) * 60_000;
    }
    // Screenshots are read top to bottom, so time never moves backwards between bubbles.
    time = Math.max(time, lastTime + 1);
    lastTime = time;
    return {
      key: String(i),
      replyToKey: null,
      time,
      author: line.system ? null : line.author,
      text: line.text,
      attachments: [],
      reactions: [],
      system: line.system,
    };
  });
  return {
    source: "screenshot",
    formatLabel: "Screenshots · read by Gemini",
    title: null,
    messages: finalizeMessages(drafts),
    timeQuality: transcript.messages.some((m) => m.time) ? "exact" : "estimated",
    warnings: ["Screenshots can be misread. Check names and times against the originals."],
  };
}
