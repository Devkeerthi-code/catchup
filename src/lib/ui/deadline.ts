import type { DeadlineItem } from "../summary/types";
import { localDateKey, localInstant } from "./format";

const HOUR = 3_600_000;

export type Urgency =
  | { kind: "urgent"; label: string }
  | { kind: "upcoming"; label: string }
  | { kind: "passed"; label: string }
  | { kind: "undated"; label: string };

/** When the deadline is. A date without a time counts as the end of that day. */
export function deadlineInstant(item: Pick<DeadlineItem, "date" | "time">): number | null {
  if (!item.date) return null;
  return item.time ? localInstant(item.date, item.time) : localInstant(item.date, "23:59");
}

/** Red is reserved for one case only: the deadline falls within the next 24 hours. */
export function deadlineUrgency(item: Pick<DeadlineItem, "date" | "time">, now: number): Urgency {
  const at = deadlineInstant(item);
  if (at === null) return { kind: "undated", label: "No date given" };
  const diff = at - now;
  if (diff < 0) return { kind: "passed", label: "Already passed" };
  if (diff <= 24 * HOUR) {
    if (!item.time) return { kind: "urgent", label: localDateKey(now) === item.date ? "Due today" : "Due tomorrow" };
    const hours = Math.floor(diff / HOUR);
    return { kind: "urgent", label: hours < 1 ? `Due in ${Math.max(1, Math.round(diff / 60_000))} min` : `Due in ${hours} h` };
  }
  const days = Math.round((localInstant(localDateKey(at)) - localInstant(localDateKey(now))) / (24 * HOUR));
  return { kind: "upcoming", label: days === 1 ? "Due tomorrow" : `In ${days} days` };
}
