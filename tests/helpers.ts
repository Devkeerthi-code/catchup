import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strToU8, zipSync } from "fflate";
import type { Message, SourceFile } from "@/lib/chat/types";

const FIXTURES = join(__dirname, "fixtures");

export function fixture(path: string): SourceFile {
  return { path, text: readFileSync(join(FIXTURES, path), "utf-8") };
}

export function fixtureBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, path)));
}

export function zip(files: Record<string, string | Uint8Array>): Uint8Array {
  const entries: Record<string, Uint8Array> = {};
  for (const [path, content] of Object.entries(files)) entries[path] = typeof content === "string" ? strToU8(content) : content;
  return zipSync(entries);
}

export function localTime(m: Message): string {
  const d = new Date(m.time);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let counter = 0;
export function msg(partial: Partial<Message> & { text: string }): Message {
  counter++;
  return {
    id: partial.id ?? `m${counter}`,
    time: partial.time ?? Date.parse("2024-03-12T10:00:00+05:30") + counter * 60_000,
    author: partial.author === undefined ? "Member 1" : partial.author,
    replyTo: partial.replyTo ?? null,
    attachments: partial.attachments ?? [],
    reactions: partial.reactions ?? [],
    system: partial.system ?? false,
    ...partial,
  };
}
