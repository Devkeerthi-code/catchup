import { downloadIcs, downloadText } from "@/lib/client/download";
import { buildIcs } from "@/lib/ics";
import type { DeadlineItem } from "@/lib/summary/types";

/** Saves a .ics file. The demo skips usage counting so example clicks don't inflate the numbers. */
export function saveCalendar(deadlines: DeadlineItem[], groupTitle: string, demo: boolean): number {
  if (!demo) return downloadIcs(deadlines, groupTitle);
  const dated = deadlines.filter((d) => d.date);
  if (dated.length) downloadText("demo-deadlines.ics", buildIcs(dated, `${groupTitle} (demo)`), "text/calendar;charset=utf-8");
  return dated.length;
}
