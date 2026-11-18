import type { Message } from "./types";

/** What adapters build before ids are assigned: `key` is the export's own id, used for replies. */
export interface DraftMessage extends Omit<Message, "id" | "replyTo"> {
  key: string;
  replyToKey: string | null;
}

/** Sorts drafts by time (stable), assigns ids m1..mN and rewires replies to the new ids. */
export function finalizeMessages(drafts: DraftMessage[]): Message[] {
  const ordered = drafts
    .map((draft, index) => ({ draft, index }))
    .filter(({ draft }) => Number.isFinite(draft.time))
    .sort((a, b) => a.draft.time - b.draft.time || a.index - b.index);

  const idByKey = new Map<string, string>();
  ordered.forEach(({ draft }, n) => idByKey.set(draft.key, `m${n + 1}`));

  return ordered.map(({ draft }, n) => {
    const { key, replyToKey, ...rest } = draft;
    void key;
    const replyTo = replyToKey ? (idByKey.get(replyToKey) ?? null) : null;
    return { ...rest, id: `m${n + 1}`, replyTo: replyTo === `m${n + 1}` ? null : replyTo };
  });
}

export function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text.replace(/^\ufeff/, ""));
  } catch {
    return undefined;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function baseName(path: string): string {
  return path.split("/").pop() ?? path;
}

export function parentDir(path: string): string {
  const parts = path.split("/");
  return parts.length > 1 ? parts[parts.length - 2] : "";
}
