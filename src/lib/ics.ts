import type { DeadlineItem } from "./summary/types";

/** RFC 5545 TEXT escaping: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded with CRLF + space, never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = out.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

function utcStamp(time: number): string {
  return new Date(time).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function hashId(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

function eventLines(item: DeadlineItem, groupTitle: string, now: number): string[] {
  if (!item.date) return [];
  const day = item.date.replace(/-/g, "");
  const lines = ["BEGIN:VEVENT", `UID:${hashId(`${groupTitle}|${item.title}|${item.date}`)}-${item.id}@catchup`, `DTSTAMP:${utcStamp(now)}`];
  if (item.time) {
    const [h, m] = item.time.split(":").map(Number);
    const endHour = String(Math.min(h + 1, 23)).padStart(2, "0");
    const endMinute = h + 1 > 23 ? "59" : String(m).padStart(2, "0");
    // Floating local time: the event shows at the time written in the chat, wherever you are.
    lines.push(`DTSTART:${day}T${item.time.replace(":", "")}00`, `DTEND:${day}T${endHour}${endMinute}00`);
  } else {
    const next = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)) + 1));
    lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, "")}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(item.title)}`);
  if (item.place) lines.push(`LOCATION:${escapeIcsText(item.place)}`);
  const notes = [`From the ${groupTitle} catch-up.`, ...item.changes].join("\n");
  lines.push(`DESCRIPTION:${escapeIcsText(notes)}`, "END:VEVENT");
  return lines;
}

/** One calendar file for every dated deadline. Items without a date can't go in a calendar. */
export function buildIcs(items: DeadlineItem[], groupTitle: string, now = Date.now()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CatchUp//Group chat catch-up//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...items.flatMap((item) => eventLines(item, groupTitle, now)),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
