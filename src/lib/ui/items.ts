import type { CatchUp, CatchUpItem, ItemType, QuoteMessage } from "../summary/types";

export type IconId =
  | "i-deadline" | "i-decision" | "i-link" | "i-question" | "i-poll" | "i-file"
  | "g-bubble" | "g-plane" | "g-hash" | "g-headset" | "g-heart" | "g-bubbles" | "g-clipboard" | "g-screenshot"
  | "u-upload" | "u-arrow" | "u-chevron" | "u-close" | "u-check" | "u-alert" | "u-lock" | "u-mask" | "u-cal-plus"
  | "u-external" | "u-sun" | "u-moon" | "u-pin" | "u-clock" | "u-device" | "u-download" | "u-replay"
  | "u-user" | "u-eye" | "u-trash" | "u-bookmark";

/** Item types are told apart by icon and label, never by colour. */
export const ITEM_META: Record<ItemType, { icon: IconId; label: string }> = {
  deadline: { icon: "i-deadline", label: "Deadline" },
  decision: { icon: "i-decision", label: "Decision" },
  question: { icon: "i-question", label: "Open question" },
  poll: { icon: "i-poll", label: "Poll" },
  link: { icon: "i-link", label: "Link" },
  file: { icon: "i-file", label: "File" },
};

export const SECTIONS = [
  { id: "deadlines", title: "Deadlines & events", short: "Deadlines", type: "deadline", key: "deadlines" },
  { id: "decisions", title: "Decisions", short: "Decisions", type: "decision", key: "decisions" },
  { id: "questions", title: "Open questions", short: "Open", type: "question", key: "questions" },
  { id: "polls", title: "Polls & results", short: "Polls", type: "poll", key: "polls" },
  { id: "links", title: "Links", short: "Links", type: "link", key: "links" },
  { id: "files", title: "Files mentioned", short: "Files", type: "file", key: "files" },
] as const satisfies readonly { id: string; title: string; short: string; type: ItemType; key: keyof CatchUp }[];

export const SOURCE_META: Record<CatchUp["source"], { icon: IconId; label: string }> = {
  whatsapp: { icon: "g-bubble", label: "WhatsApp" },
  telegram: { icon: "g-plane", label: "Telegram" },
  slack: { icon: "g-hash", label: "Slack" },
  discord: { icon: "g-headset", label: "Discord" },
  meta: { icon: "g-heart", label: "Instagram / Messenger" },
  plaintext: { icon: "g-clipboard", label: "Pasted text" },
  screenshot: { icon: "g-screenshot", label: "Screenshots" },
};

export function itemsOf(catchup: CatchUp): CatchUpItem[] {
  return [...catchup.deadlines, ...catchup.decisions, ...catchup.questions, ...catchup.polls, ...catchup.links, ...catchup.files];
}

/** A short title for timeline chips and TL;DR anchors. */
export function itemTitle(item: CatchUpItem): string {
  switch (item.type) {
    case "decision":
      return item.text;
    case "deadline":
      return item.title;
    case "link":
      return item.domain;
    case "file":
      return item.name;
    case "question":
      return item.question;
    case "poll":
      return item.question;
  }
}

/** Ids look like "m1", "m2"... in time order within one parsed chat. */
function messageNumber(id: string): number {
  const n = Number(id.replace(/^\D+/, ""));
  return Number.isFinite(n) ? n : Number.NaN;
}

/** The kept messages around a cited one, but only real neighbours (no jumps over gaps). */
export function contextAround(quotes: QuoteMessage[], sourceId: string, around = 3): QuoteMessage[] {
  const index = quotes.findIndex((q) => q.id === sourceId);
  if (index === -1) return [];
  const center = messageNumber(sourceId);
  return quotes
    .slice(Math.max(0, index - around), index + around + 1)
    .filter((q) => Number.isNaN(center) || Math.abs(messageNumber(q.id) - center) <= around);
}
