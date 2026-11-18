import type { CatchUpItem } from "../summary/types";
import { localDateKey } from "./format";

export interface Band {
  id: "morning" | "afternoon" | "evening" | "night";
  label: string;
  range: string;
  /** Start hour, inclusive. Night runs past midnight, so its end is 29 (= 5 AM next day). */
  from: number;
  to: number;
}

export const BANDS: Band[] = [
  { id: "morning", label: "Morning", range: "5 AM to 12 PM", from: 5, to: 12 },
  { id: "afternoon", label: "Afternoon", range: "12 to 5 PM", from: 12, to: 17 },
  { id: "evening", label: "Evening", range: "5 to 9 PM", from: 17, to: 21 },
  { id: "night", label: "Night", range: "9 PM to 5 AM", from: 21, to: 29 },
];

/** Fractional local hour, with 0-5 AM moved after midnight so it lands in the night band. */
export function bandHour(time: number): number {
  const d = new Date(time);
  const h = d.getHours() + d.getMinutes() / 60;
  return h < 5 ? h + 24 : h;
}

export function bandFor(time: number): Band {
  const h = bandHour(time);
  return BANDS.find((b) => h >= b.from && h < b.to) ?? BANDS[3];
}

/**
 * The day an item belongs to on the strip. Items in the small hours count towards the
 * evening before, so a night band reads 9 PM to 5 AM without splitting across two days.
 */
export function stripDay(time: number): string {
  const d = new Date(time);
  if (d.getHours() < 5) d.setDate(d.getDate() - 1);
  return localDateKey(d.getTime());
}

export interface StripDay {
  date: string;
  items: CatchUpItem[];
}

/** Days that have at least one item, oldest first, items in time order. */
export function groupByStripDay(items: CatchUpItem[]): StripDay[] {
  const days = new Map<string, CatchUpItem[]>();
  for (const item of [...items].sort((a, b) => a.at - b.at)) {
    const key = stripDay(item.at);
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, dayItems]) => ({ date, items: dayItems }));
}

/** Position inside a band, 0..100, for the desktop strip. */
export function bandPosition(time: number, band: Band): number {
  const x = ((bandHour(time) - band.from) / (band.to - band.from)) * 100;
  return Math.min(100, Math.max(0, x));
}

/** Hour-of-day counts for one band, in band order (night wraps past midnight). */
export function bandHours(hours: number[], band: Band): number[] {
  const out: number[] = [];
  for (let h = band.from; h < band.to; h++) out.push(hours[h % 24] ?? 0);
  return out;
}
