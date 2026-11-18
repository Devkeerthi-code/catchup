import type { ParsedChat } from "../chat/types";
import type { Insights } from "../insights";
import type { MergedItems } from "./merge";
import type { TldrInputItem } from "./prompt";
import type { CatchUp, CatchUpItem, CatchUpStats, TldrLine } from "./types";

const SECONDS_PER_MESSAGE = 2.5;
const SECONDS_PER_ITEM = 10;

/**
 * "Minutes saved" is an estimate, and the UI says how it's worked out: about 2.5 s to scroll
 * past and read each message, minus about 10 s to read each catch-up item.
 */
export function computeStats(messagesRead: number, noiseRemoved: number, signalItems: number): CatchUpStats {
  const seconds = messagesRead * SECONDS_PER_MESSAGE - signalItems * SECONDS_PER_ITEM;
  return { messagesRead, noiseRemoved, signalItems, minutesSaved: Math.max(0, Math.round(seconds / 60)) };
}

export function allItems(items: Omit<MergedItems, "highlights">): CatchUpItem[] {
  return [...items.decisions, ...items.deadlines, ...items.links, ...items.files, ...items.questions, ...items.polls];
}

function describeItem(item: CatchUpItem): string {
  switch (item.type) {
    case "decision":
      return item.text;
    case "deadline":
      return [item.title, item.date, item.time, item.place].filter(Boolean).join(" · ");
    case "link":
      return `Link to ${item.domain}${item.shares > 1 ? ` (shared ${item.shares} times)` : ""}`;
    case "file":
      return `File: ${item.name}`;
    case "question":
      return `Unanswered: ${item.question}`;
    case "poll":
      return `Poll: ${item.question}${item.result ? ` → ${item.result}` : ""}`;
  }
}

/** Items sent for the TL;DR call. Highlights get ids "h1".. so they can be cited too. */
export function tldrInput(merged: MergedItems): TldrInputItem[] {
  const highlights = merged.highlights.map((h, i) => ({ id: `h${i + 1}`, type: "highlight", text: h.text }));
  const items = allItems(merged)
    .filter((item) => item.type !== "link")
    .map((item) => ({ id: item.id, type: item.type, text: describeItem(item) }));
  return [...highlights, ...items].slice(0, 80);
}

export function sourceIdsForItemIds(itemIds: string[], merged: MergedItems): string[] {
  const byId = new Map<string, string[]>();
  merged.highlights.forEach((h, i) => byId.set(`h${i + 1}`, h.sourceIds));
  for (const item of allItems(merged)) byId.set(item.id, item.sourceIds);
  return [...new Set(itemIds.flatMap((id) => byId.get(id) ?? []))];
}

/** Used when the TL;DR call fails or is rate-limited: the first five highlights, as written. */
export function fallbackTldr(merged: MergedItems): TldrLine[] {
  const fromHighlights = merged.highlights.slice(0, 5);
  if (fromHighlights.length) return fromHighlights;
  return allItems(merged)
    .filter((item) => item.type === "decision" || item.type === "deadline")
    .slice(0, 5)
    .map((item) => ({ text: describeItem(item), sourceIds: item.sourceIds }));
}

export interface AssembleInput {
  id: string;
  chat: ParsedChat;
  rangeMessages: { time: number }[];
  insights: Insights;
  merged: MergedItems;
  tldr: TldrLine[];
  warnings: string[];
  now?: number;
}

export function assembleCatchUp(input: AssembleInput): CatchUp {
  const { merged, rangeMessages } = input;
  const items = allItems(merged).filter((item) => item.type !== "link");
  const signal = items.length + merged.links.length;
  return {
    version: 1,
    id: input.id,
    title: input.chat.title ?? "Your group chat",
    source: input.chat.source,
    formatLabel: input.chat.formatLabel,
    createdAt: input.now ?? Date.now(),
    range: {
      from: rangeMessages[0]?.time ?? 0,
      to: rangeMessages[rangeMessages.length - 1]?.time ?? 0,
    },
    stats: computeStats(rangeMessages.length, input.insights.noiseMessages, signal),
    tldr: input.tldr.slice(0, 5),
    decisions: merged.decisions,
    deadlines: merged.deadlines,
    links: merged.links,
    files: merged.files,
    questions: merged.questions,
    polls: merged.polls,
    insights: input.insights,
    warnings: input.warnings,
  };
}
