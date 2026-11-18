import { z } from "zod";
import type { Message } from "./types";

export const rangeSpecSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("all") }),
  z.object({ kind: z.literal("since"), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ kind: z.literal("lastDays"), days: z.number().int().min(1).max(365) }),
  z.object({ kind: z.literal("sinceMine"), author: z.string().min(1) }),
]);
export type RangeSpec = z.infer<typeof rangeSpecSchema>;

export interface RangeResult {
  messages: Message[];
  /** Explains a fallback, e.g. "You haven't posted in this chat, so everything is included." */
  note: string | null;
}

function startOfLocalDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** `now` defaults to the newest message, so an old export still shows its own "last 3 days". */
export function applyRange(messages: Message[], spec: RangeSpec, now?: number): RangeResult {
  if (!messages.length || spec.kind === "all") return { messages, note: null };
  const reference = now ?? messages[messages.length - 1].time;

  if (spec.kind === "since") {
    const from = startOfLocalDay(spec.date);
    return { messages: messages.filter((m) => m.time >= from), note: null };
  }
  if (spec.kind === "lastDays") {
    const from = reference - spec.days * 86_400_000;
    return { messages: messages.filter((m) => m.time >= from), note: null };
  }
  let lastMine = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].author === spec.author) {
      lastMine = i;
      break;
    }
  }
  if (lastMine === -1) {
    return { messages, note: `${spec.author} hasn't posted in this chat, so every message is included.` };
  }
  return { messages: messages.slice(lastMine + 1), note: null };
}

/** People ranked by message count, used for the "who are you?" picker. */
export function authorsByActivity(messages: Message[]): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const m of messages) if (m.author && !m.system) counts.set(m.author, (counts.get(m.author) ?? 0) + 1);
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
