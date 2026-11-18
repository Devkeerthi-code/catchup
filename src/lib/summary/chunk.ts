import { z } from "zod";
import type { Message } from "../chat/types";

/** Compact wire format for one message. Short keys keep the request (and tokens) small. */
export const payloadMessageSchema = z.object({
  id: z.string().regex(/^m\d{1,7}$/),
  /** Local time, "Tue 2024-03-12 21:45": the model needs weekday + date to resolve "Friday". */
  t: z.string().max(24),
  a: z.string().regex(/^(Member \d{1,5}|System)$/),
  x: z.string().max(1600),
  r: z.string().regex(/^m\d{1,7}$/).optional(),
  /** 1 = context only (carried over from the previous chunk). Not to be cited. */
  c: z.literal(1).optional(),
});
export type PayloadMessage = z.infer<typeof payloadMessageSchema>;

export const CHUNK_TOKEN_BUDGET = 12_000;
export const MAX_CHUNKS_PER_RUN = 10;
const CONTEXT_OVERLAP = 4;
const MAX_TEXT = 1500;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatLocal(time: number): string {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${WEEKDAYS[d.getDay()]} ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function describe(message: Message): string {
  const parts = [message.text];
  for (const a of message.attachments) parts.push(a.name ? `[${a.kind}: ${a.name}]` : `[${a.kind}]`);
  if (message.poll) {
    const options = message.poll.options.map((o) => `${o.text}${o.votes !== null ? ` (${o.votes})` : ""}`);
    parts.push(`[poll${message.poll.closed ? ", closed" : ""}: ${options.join(" | ")}]`);
  }
  if (message.forwarded) parts.unshift("[forwarded]");
  const text = parts.filter(Boolean).join(" ");
  return text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text;
}

/** Expects already-sanitised messages: authors must be pseudonyms. */
export function toPayloadMessage(message: Message): PayloadMessage {
  const out: PayloadMessage = {
    id: message.id,
    t: formatLocal(message.time),
    a: message.author ?? "System",
    x: describe(message),
  };
  if (message.replyTo) out.r = message.replyTo;
  return out;
}

/** Rough count (≈3.5 chars per token for mixed English/Hinglish, plus JSON overhead). */
export function estimateTokens(message: PayloadMessage): number {
  return Math.ceil((message.x.length + message.t.length + message.a.length + 40) / 3.5);
}

export interface PayloadChunk {
  index: number;
  messages: PayloadMessage[];
}

/**
 * Splits time-ordered messages into chunks under the token budget. Each chunk after the first
 * starts with a few context-only messages from the end of the previous one, so a reply that
 * crosses the boundary is still understood. Context messages can't be cited.
 */
export function chunkMessages(messages: PayloadMessage[], budget = CHUNK_TOKEN_BUDGET): PayloadChunk[] {
  const chunks: PayloadChunk[] = [];
  let current: PayloadMessage[] = [];
  let used = 0;
  for (const message of messages) {
    const cost = estimateTokens(message);
    const hasOwnMessages = current.some((m) => !m.c);
    if (hasOwnMessages && used + cost > budget) {
      chunks.push({ index: chunks.length, messages: current });
      const tail = current.filter((m) => !m.c).slice(-CONTEXT_OVERLAP).map((m) => ({ ...m, c: 1 as const }));
      current = tail;
      used = tail.reduce((sum, m) => sum + estimateTokens(m), 0);
    }
    current.push(message);
    used += cost;
  }
  if (current.some((m) => !m.c)) chunks.push({ index: chunks.length, messages: current });
  return chunks;
}

export function citableIds(chunk: { messages: PayloadMessage[] }): Set<string> {
  return new Set(chunk.messages.filter((m) => !m.c).map((m) => m.id));
}
