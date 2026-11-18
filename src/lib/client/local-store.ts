import type { Message } from "../chat/types";
import type { CatchUp, QuoteMessage } from "../summary/types";

/**
 * Catch-ups and the source messages behind them are kept in this browser only (localStorage).
 * The quotes are what make "Open in context" work; they are never uploaded, even when saving.
 */
const PREFIX = "catchup:run:";
const INDEX_KEY = "catchup:runs";
const KEEP = 8;

export interface LocalRun {
  catchup: CatchUp;
  quotes: QuoteMessage[];
  /** [real name, pseudonym]; lets this device show real names again. */
  pseudonyms: [string, string][];
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function toQuotes(messages: Message[]): QuoteMessage[] {
  return messages.map((m) => ({ id: m.id, time: m.time, author: m.author, text: m.text, system: m.system }));
}

export function saveRun(run: LocalRun): boolean {
  const ids = (read<string[]>(INDEX_KEY) ?? []).filter((id) => id !== run.catchup.id);
  ids.unshift(run.catchup.id);
  for (const old of ids.slice(KEEP)) {
    try {
      localStorage.removeItem(PREFIX + old);
    } catch {
      // Storage unavailable; nothing to clean up.
    }
  }
  write(INDEX_KEY, ids.slice(0, KEEP));
  // If quotes don't fit (storage full), keep the summary so the page still works.
  return write(PREFIX + run.catchup.id, run) || write(PREFIX + run.catchup.id, { ...run, quotes: [] });
}

export function loadRun(id: string): LocalRun | null {
  return read<LocalRun>(PREFIX + id);
}

export function recentRuns(): CatchUp[] {
  return (read<string[]>(INDEX_KEY) ?? []).flatMap((id) => {
    const run = loadRun(id);
    return run ? [run.catchup] : [];
  });
}

export function forgetRun(id: string): void {
  try {
    localStorage.removeItem(PREFIX + id);
    write(INDEX_KEY, (read<string[]>(INDEX_KEY) ?? []).filter((x) => x !== id));
  } catch {
    // Storage unavailable.
  }
}
