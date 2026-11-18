import type { RangeSpec } from "../chat/range";
import type { ChatOverview } from "../client/prepare";
import { localDateKey } from "./format";

/** What the range picker holds; turned into a RangeSpec only when it is complete. */
export interface RangeChoice {
  kind: RangeSpec["kind"];
  days: number;
  date: string;
  author: string;
}

export const MIN_DAYS = 1;
export const MAX_DAYS = 60;
/** Small chats are cheap to read whole, so "everything" is the sensible default for them. */
const SMALL_CHAT = 600;

export function defaultRange(chat: ChatOverview): RangeChoice {
  const date = localDateKey(Math.max(chat.firstTime, chat.lastTime - 2 * 86_400_000));
  const small = chat.messageCount <= SMALL_CHAT || chat.source === "screenshot";
  return { kind: small ? "all" : "lastDays", days: 3, date, author: "" };
}

/** Null while the choice is incomplete (no date picked, or "which one is you?" unanswered). */
export function toRangeSpec(choice: RangeChoice): RangeSpec | null {
  switch (choice.kind) {
    case "all":
      return { kind: "all" };
    case "lastDays":
      return { kind: "lastDays", days: Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(choice.days))) };
    case "since":
      return /^\d{4}-\d{2}-\d{2}$/.test(choice.date) ? { kind: "since", date: choice.date } : null;
    case "sinceMine":
      return choice.author ? { kind: "sinceMine", author: choice.author } : null;
  }
}

/** Chats in an export, busiest first, so the likely one is preselected. */
export function chatsByActivity(chats: ChatOverview[]): ChatOverview[] {
  return [...chats].sort((a, b) => b.messageCount - a.messageCount);
}

/** One plain line under the picker saying what will be read. */
export function describeRange(choice: RangeChoice): string {
  switch (choice.kind) {
    case "all":
      return "Every message in the export";
    case "lastDays":
      return `The last ${choice.days} ${choice.days === 1 ? "day" : "days"} of the chat`;
    case "since":
      return "Everything since the morning of that day";
    case "sinceMine":
      return "Everything after the last thing you sent";
  }
}
