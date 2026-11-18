import { domainOf, extractUrls, isNoise } from "./chat/text";
import type { Message } from "./chat/types";

export interface Insights {
  totalMessages: number;
  noiseMessages: number;
  /** Messages per hour of day, index 0 = midnight. Local time of the device. */
  hours: number[];
  /** Messages per calendar day, oldest first, gaps filled with zero. */
  days: { date: string; count: number }[];
  /** Pseudonymous members by message count. */
  members: { name: string; count: number }[];
  domains: { domain: string; count: number }[];
  timeQuality: "exact" | "estimated";
}

function localDate(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ranked(counts: Map<string, number>, n: number): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

const MAX_DAYS = 120;

/** Computed on the device from already-pseudonymised messages. No AI involved. */
export function computeInsights(messages: Message[], timeQuality: "exact" | "estimated"): Insights {
  const hours = new Array<number>(24).fill(0);
  const days = new Map<string, number>();
  const members = new Map<string, number>();
  const domains = new Map<string, number>();
  let noise = 0;

  for (const m of messages) {
    if (isNoise(m)) noise++;
    if (m.system) continue;
    hours[new Date(m.time).getHours()]++;
    const day = localDate(m.time);
    days.set(day, (days.get(day) ?? 0) + 1);
    if (m.author) members.set(m.author, (members.get(m.author) ?? 0) + 1);
    for (const url of extractUrls(m.text)) {
      const domain = domainOf(url);
      domains.set(domain, (domains.get(domain) ?? 0) + 1);
    }
  }

  return {
    totalMessages: messages.length,
    noiseMessages: noise,
    hours,
    days: fillDays(messages, days),
    members: ranked(members, 8).map(([name, count]) => ({ name, count })),
    domains: ranked(domains, 6).map(([domain, count]) => ({ domain, count })),
    timeQuality,
  };
}

function fillDays(messages: Message[], counts: Map<string, number>): { date: string; count: number }[] {
  if (!messages.length) return [];
  const out: { date: string; count: number }[] = [];
  const end = new Date(messages[messages.length - 1].time);
  end.setHours(12, 0, 0, 0);
  const cursor = new Date(messages[0].time);
  cursor.setHours(12, 0, 0, 0);
  if ((end.getTime() - cursor.getTime()) / 86_400_000 > MAX_DAYS) cursor.setTime(end.getTime() - MAX_DAYS * 86_400_000);
  while (cursor <= end) {
    const date = localDate(cursor.getTime());
    out.push({ date, count: counts.get(date) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
