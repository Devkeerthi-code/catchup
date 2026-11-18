import "server-only";
import type { UsageAction } from "../usage";
import { db } from "./db";

function today(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Adds one to today's count. Failures are swallowed: counting must never break the app. */
export async function track(action: UsageAction): Promise<void> {
  try {
    await db().usageCount.upsert({
      where: { day_action: { day: today(), action } },
      create: { day: today(), action, count: 1 },
      update: { count: { increment: 1 } },
    });
  } catch (error) {
    console.error("usage tracking failed", error instanceof Error ? error.message : error);
  }
}

export async function usageTotals(): Promise<{ action: string; total: number; last7: number }[]> {
  const since = new Date(today().getTime() - 6 * 86_400_000);
  const [all, recent] = await Promise.all([
    db().usageCount.groupBy({ by: ["action"], _sum: { count: true } }),
    db().usageCount.groupBy({ by: ["action"], _sum: { count: true }, where: { day: { gte: since } } }),
  ]);
  const recentByAction = new Map(recent.map((r) => [r.action, r._sum.count ?? 0]));
  return all
    .map((r) => ({ action: r.action, total: r._sum.count ?? 0, last7: recentByAction.get(r.action) ?? 0 }))
    .sort((a, b) => b.total - a.total);
}
