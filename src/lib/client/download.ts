import { buildIcs } from "../ics";
import type { DeadlineItem } from "../summary/types";
import { trackUsage } from "./api";

function slug(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 40) || "catchup";
}

export function downloadText(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Returns how many events were exported (deadlines without a date can't be). */
export function downloadIcs(deadlines: DeadlineItem[], groupTitle: string): number {
  const dated = deadlines.filter((d) => d.date);
  if (!dated.length) return 0;
  downloadText(`${slug(groupTitle)}-deadlines.ics`, buildIcs(dated, groupTitle), "text/calendar;charset=utf-8");
  trackUsage("ics_downloaded");
  return dated.length;
}
