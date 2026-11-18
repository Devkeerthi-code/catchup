import { finalizeMessages, isRecord, parseJsonSafe, str, type DraftMessage } from "../finalize";
import { attachmentKindFromName } from "../text";
import type { Attachment, ChatAdapter, ParsedChat, Poll, Reaction, SourceFile } from "../types";
import { ParseError } from "../types";

type TelegramChat = Record<string, unknown> & { messages: unknown[] };

/** Telegram text is a string, or an array mixing strings and entity objects ({type, text, href}). */
function flattenText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (!isRecord(part)) return "";
      const text = str(part.text);
      const href = str(part.href);
      return href && href !== text ? `${text} (${href})` : text;
    })
    .join("");
}

const MEDIA_KIND: Record<string, Attachment["kind"]> = {
  sticker: "sticker",
  animation: "gif",
  voice_message: "audio",
  audio_file: "audio",
  video_file: "video",
  video_message: "video",
};

function attachmentsOf(msg: Record<string, unknown>): Attachment[] {
  const out: Attachment[] = [];
  const omitted = (v: unknown) => typeof v === "string" && v.startsWith("(File not included");
  if (msg.photo) out.push({ kind: "image", omitted: omitted(msg.photo) || undefined });
  if (msg.file) {
    const mediaType = str(msg.media_type);
    const name = str(msg.file_name) || undefined;
    const kind = MEDIA_KIND[mediaType] ?? (name ? attachmentKindFromName(name) : "document");
    out.push({ kind, name, omitted: omitted(msg.file) || undefined });
  }
  if (msg.contact_information) out.push({ kind: "contact" });
  if (msg.location_information) out.push({ kind: "location" });
  return out;
}

function reactionsOf(msg: Record<string, unknown>): Reaction[] {
  if (!Array.isArray(msg.reactions)) return [];
  return msg.reactions.filter(isRecord).map((r) => ({
    emoji: str(r.emoji) || "★",
    count: typeof r.count === "number" ? r.count : 1,
  }));
}

function pollOf(msg: Record<string, unknown>): Poll | undefined {
  if (!isRecord(msg.poll)) return undefined;
  const answers = Array.isArray(msg.poll.answers) ? msg.poll.answers.filter(isRecord) : [];
  return {
    question: str(msg.poll.question),
    closed: msg.poll.closed === true,
    options: answers.map((a) => ({
      text: str(a.text),
      votes: typeof a.voters === "number" ? a.voters : null,
    })),
  };
}

function timeOf(msg: Record<string, unknown>): number {
  const unix = Number(str(msg.date_unixtime));
  if (unix > 0) return unix * 1000;
  return new Date(str(msg.date)).getTime();
}

function serviceText(msg: Record<string, unknown>): string {
  const actor = str(msg.actor) || str(msg.from);
  const action = str(msg.action).replace(/_/g, " ");
  const title = str(msg.title);
  return [actor, action, title && `"${title}"`].filter(Boolean).join(" ");
}

function toDraft(msg: Record<string, unknown>): DraftMessage {
  const isService = msg.type === "service";
  const poll = pollOf(msg);
  const forwarded = str(msg.forwarded_from);
  const text = flattenText(msg.text);
  return {
    key: String(msg.id),
    replyToKey: msg.reply_to_message_id != null ? String(msg.reply_to_message_id) : null,
    time: timeOf(msg),
    author: isService ? null : str(msg.from) || "Deleted Account",
    text: isService ? serviceText(msg) : poll ? poll.question : text,
    attachments: isService ? [] : attachmentsOf(msg),
    reactions: reactionsOf(msg),
    system: isService,
    forwarded: forwarded ? true : undefined,
    poll,
  };
}

function parseChat(chat: TelegramChat): ParsedChat {
  const drafts = chat.messages.filter(isRecord).map(toDraft);
  return {
    source: "telegram",
    formatLabel: "Telegram Desktop · JSON",
    title: str(chat.name) || null,
    messages: finalizeMessages(drafts),
    timeQuality: "exact",
    warnings: [],
  };
}

function chatsIn(file: SourceFile): TelegramChat[] {
  const data = parseJsonSafe(file.text);
  if (!isRecord(data)) return [];
  if (Array.isArray(data.messages)) return [data as TelegramChat];
  // A full-account export nests every chat under chats.list.
  const list = isRecord(data.chats) && Array.isArray(data.chats.list) ? data.chats.list : [];
  return list.filter((c): c is TelegramChat => isRecord(c) && Array.isArray(c.messages));
}

export const telegramAdapter: ChatAdapter = {
  id: "telegram",
  label: "Telegram",
  detect(files) {
    const json = files.find((f) => f.path.endsWith(".json") || f.text.trimStart().startsWith("{"));
    if (!json) return 0;
    const head = json.text.slice(0, 4000);
    const looksLikeTelegram = /"date_unixtime"|"from_id"\s*:\s*"(user|channel)/.test(head);
    return looksLikeTelegram && /"messages"\s*:/.test(json.text.slice(0, 20000)) ? 0.95 : 0;
  },
  parse(files) {
    const chats = files.filter((f) => f.path.endsWith(".json") || !f.path.includes(".")).flatMap(chatsIn);
    if (!chats.length) throw new ParseError("No Telegram chats were found in this JSON.");
    return chats.map(parseChat).filter((c) => c.messages.length > 0);
  },
};
