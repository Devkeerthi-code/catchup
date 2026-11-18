/** Display formatting. Everything uses the device's time zone; callers render it on the client. */

const LOCALE = "en-IN";

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString(LOCALE);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

export function formatTime(time: number): string {
  return new Date(time).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
}

export function formatDay(time: number): string {
  return new Date(time).toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" });
}

export function formatShortDate(time: number): string {
  return new Date(time).toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
}

export function formatDayTime(time: number): string {
  return `${formatDay(time)}, ${formatTime(time)}`;
}

/** "Fri 20 Nov, 7:02 AM to 11:48 PM" or "Thu 19 Nov, 9:00 PM to Sat 21 Nov, 8:10 AM". */
export function formatSpan(from: number, to: number): string {
  if (!from || !to) return "No messages";
  const sameDay = new Date(from).toDateString() === new Date(to).toDateString();
  return sameDay ? `${formatDayTime(from)} to ${formatTime(to)}` : `${formatDayTime(from)} to ${formatDayTime(to)}`;
}

/** "YYYY-MM-DD" in local time, for date inputs and day grouping. */
export function localDateKey(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parses "YYYY-MM-DD" (+ optional "HH:MM") as local wall-clock time. */
export function localInstant(date: string, time?: string | null): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

export function formatDateKey(date: string): string {
  return formatDay(localInstant(date));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export function hourLabel(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}
