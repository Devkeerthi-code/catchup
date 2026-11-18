import { finalizeMessages, isRecord, parseJsonSafe, str, type DraftMessage } from "../finalize";
import { fixMetaEncodingDeep } from "../meta-encoding";
import { attachmentKindFromName } from "../text";
import type { Attachment, ChatAdapter, ParsedChat, Reaction, SourceFile } from "../types";
import { ParseError } from "../types";

const SYSTEM_TYPES = new Set(["Call", "Subscribe", "Unsubscribe"]);
const SYSTEM_TEXT = /^((liked a message|reacted .{1,8} to (your|a) message)\.?$|.{1,80} (sent an attachment|liked a message|reacted .{1,8} to your message|started a (video )?call|missed (your|a) call|named the group|changed the group photo|added .+ to the group|left the group|set the nickname|set your nickname)|you (sent an attachment|are now connected)\b)/i;

type App = "Instagram" | "Messenger";

function appFromPath(path: string): App {
  return /instagram/i.test(path) ? "Instagram" : "Messenger";
}

function mediaOf(msg: Record<string, unknown>): Attachment[] {
  const groups: [string, Attachment["kind"]][] = [
    ["photos", "image"], ["videos", "video"], ["audio_files", "audio"], ["gifs", "gif"], ["files", "document"],
  ];
  const out: Attachment[] = [];
  for (const [field, kind] of groups) {
    const list = Array.isArray(msg[field]) ? (msg[field] as unknown[]).filter(isRecord) : [];
    for (const item of list) {
      const name = str(item.uri).split("/").pop() || undefined;
      out.push({ kind: kind === "document" && name ? attachmentKindFromName(name) : kind, name: kind === "document" ? name : undefined });
    }
  }
  if (isRecord(msg.sticker)) out.push({ kind: "sticker" });
  return out;
}

function groupReactions(list: unknown): Reaction[] {
  if (!Array.isArray(list)) return [];
  const counts = new Map<string, number>();
  for (const r of list.filter(isRecord)) {
    const emoji = str(r.reaction);
    if (emoji) counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
  }
  return [...counts.entries()].map(([emoji, count]) => ({ emoji, count }));
}

/** Classic "Download your information" shape: sender_name, timestamp_ms, content, newest first. */
function classicDraft(msg: Record<string, unknown>, index: number): DraftMessage {
  const share = isRecord(msg.share) ? msg.share : {};
  const link = str(share.link);
  const content = msg.is_unsent ? "" : str(msg.content);
  const text = link && !content.includes(link) ? [content, link].filter(Boolean).join(" ") : content;
  const system = SYSTEM_TYPES.has(str(msg.type)) || SYSTEM_TEXT.test(content);
  return {
    key: String(index),
    replyToKey: null,
    time: Number(msg.timestamp_ms),
    author: system ? null : str(msg.sender_name) || null,
    text,
    attachments: system ? [] : mediaOf(msg),
    reactions: groupReactions(msg.reactions),
    system,
  };
}

/** Newer end-to-end-encrypted Messenger export: senderName, timestamp, text, media. */
function e2eeDraft(msg: Record<string, unknown>, index: number): DraftMessage {
  const media = Array.isArray(msg.media) ? msg.media.filter(isRecord) : [];
  const text = msg.isUnsent ? "" : str(msg.text);
  return {
    key: String(index),
    replyToKey: null,
    time: Number(msg.timestamp),
    author: str(msg.senderName) || null,
    text,
    attachments: media.map((m) => ({ kind: attachmentKindFromName(str(m.uri)) })),
    reactions: groupReactions(Array.isArray(msg.reactions) ? msg.reactions.map((r) => (isRecord(r) ? { reaction: r.reaction } : r)) : []),
    system: SYSTEM_TEXT.test(text),
  };
}

interface Thread {
  app: App;
  title: string;
  drafts: DraftMessage[];
}

function readThreadFile(file: SourceFile): Omit<Thread, "app"> | null {
  const raw = parseJsonSafe(file.text);
  if (!isRecord(raw) || !Array.isArray(raw.messages)) return null;
  const data = fixMetaEncodingDeep(raw);
  const messages = (data.messages as unknown[]).filter(isRecord);
  const isE2ee = messages.some((m) => "senderName" in m);
  const offset = Number(/message_(\d+)\.json$/.exec(file.path)?.[1] ?? 1) * 1_000_000;
  const drafts = messages.map((m, i) => (isE2ee ? e2eeDraft(m, offset + i) : classicDraft(m, offset + i)));
  return { title: str(data.title) || str(data.threadName), drafts };
}

export const metaAdapter: ChatAdapter = {
  id: "meta",
  label: "Instagram / Messenger",
  detect(files) {
    const json = files.find((f) => f.path.endsWith(".json") && /"participants"\s*:/.test(f.text.slice(0, 5000)));
    if (!json) return 0;
    const head = json.text.slice(0, 8000);
    return /"sender_name"|"senderName"/.test(head) && /"timestamp_ms"|"timestamp"/.test(head) ? 0.95 : 0;
  },
  parse(files) {
    // message_1.json, message_2.json ... in one folder are pages of the same thread.
    const threads = new Map<string, Thread>();
    for (const file of files.filter((f) => f.path.endsWith(".json"))) {
      const thread = readThreadFile(file);
      if (!thread) continue;
      const folder = file.path.includes("/") ? file.path.slice(0, file.path.lastIndexOf("/")) : file.path;
      const existing = threads.get(folder);
      if (existing) existing.drafts.push(...thread.drafts);
      else threads.set(folder, { app: appFromPath(file.path), ...thread });
    }
    if (!threads.size) throw new ParseError("No Instagram or Messenger conversations were found.");
    const chats: ParsedChat[] = [...threads.values()].map((t) => ({
      source: "meta",
      formatLabel: `${t.app} · Download your information · JSON`,
      title: t.title || null,
      messages: finalizeMessages(t.drafts),
      timeQuality: "exact",
      warnings: [],
    }));
    return chats.filter((c) => c.messages.length > 0).sort((a, b) => b.messages.length - a.messages.length);
  },
};
