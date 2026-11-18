import { csvRecords } from "../csv";
import { baseName, finalizeMessages, isRecord, parseJsonSafe, str, type DraftMessage } from "../finalize";
import { attachmentKindFromName } from "../text";
import type { Attachment, ChatAdapter, ParsedChat, Reaction, SourceFile } from "../types";
import { ParseError } from "../types";

// DiscordChatExporter message types that are app-generated rather than written by someone.
const SYSTEM_TYPES = new Set([
  "GuildMemberJoin", "RecipientAdd", "RecipientRemove", "ChannelPinnedMessage", "ChannelNameChange",
  "ChannelIconChange", "Call", "ThreadCreated", "GuildBoost", "ChannelFollowAdd",
]);
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** ISO with offset (current exporter) or "12-Mar-24 09:45 PM" (older exporter CSVs). */
export function parseDiscordDate(value: string): number {
  const iso = Date.parse(value);
  if (!Number.isNaN(iso)) return iso;
  const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4}) (\d{1,2}):(\d{2})(?::(\d{2}))? ?([AP]M)?$/i.exec(value.trim());
  if (!m) return NaN;
  const [, d, mon, y, h, min, s, ampm] = m;
  let hour = Number(h);
  if (ampm?.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (ampm?.toUpperCase() === "AM" && hour === 12) hour = 0;
  const year = Number(y) < 100 ? 2000 + Number(y) : Number(y);
  return new Date(year, MONTHS.indexOf(mon.toLowerCase()), Number(d), hour, Number(min), Number(s ?? 0)).getTime();
}

function splitList(value: string): string[] {
  return value.split(/,(?=\s*\S)/).map((s) => s.trim()).filter(Boolean);
}

function attachmentsFromUrls(value: string): Attachment[] {
  return splitList(value).map((url) => {
    const name = decodeURIComponent(baseName(url.split("?")[0]));
    return { kind: attachmentKindFromName(name), name };
  });
}

function reactionsFromCsv(value: string): Reaction[] {
  return splitList(value).map((part) => {
    const m = /^(.+?)\s*\((\d+)\)$/.exec(part);
    return m ? { emoji: m[1], count: Number(m[2]) } : { emoji: part, count: 1 };
  });
}

function fromExporterJson(data: Record<string, unknown>): ParsedChat {
  const guild = isRecord(data.guild) ? str(data.guild.name) : "";
  const channel = isRecord(data.channel) ? str(data.channel.name) : "";
  const messages = Array.isArray(data.messages) ? data.messages.filter(isRecord) : [];
  const drafts: DraftMessage[] = messages.map((msg) => {
    const author = isRecord(msg.author) ? str(msg.author.nickname) || str(msg.author.name) : "";
    const system = SYSTEM_TYPES.has(str(msg.type));
    const attachments = Array.isArray(msg.attachments) ? msg.attachments.filter(isRecord) : [];
    const stickers = Array.isArray(msg.stickers) ? msg.stickers : [];
    const reactions = Array.isArray(msg.reactions) ? msg.reactions.filter(isRecord) : [];
    return {
      key: str(msg.id),
      replyToKey: isRecord(msg.reference) ? str(msg.reference.messageId) || null : null,
      time: parseDiscordDate(str(msg.timestamp)),
      author: system ? null : author || null,
      text: system && !str(msg.content) ? `${author} ${str(msg.type)}` : str(msg.content),
      attachments: [
        ...attachments.map((a) => ({ kind: attachmentKindFromName(str(a.fileName)), name: str(a.fileName) || undefined })),
        ...stickers.map(() => ({ kind: "sticker" as const })),
      ],
      reactions: reactions.map((r) => ({
        emoji: isRecord(r.emoji) ? str(r.emoji.name) || "★" : "★",
        count: typeof r.count === "number" ? r.count : 1,
      })),
      system,
    };
  });
  return chat(drafts, "Discord · DiscordChatExporter JSON", [guild, channel && `#${channel}`].filter(Boolean).join(" · "));
}

/** Discord's own data package only contains messages you sent, one folder per channel. */
function fromDataPackage(rows: Record<string, unknown>[], channelFile: SourceFile | undefined, format: string): ParsedChat {
  const info = channelFile ? parseJsonSafe(channelFile.text) : undefined;
  const title = isRecord(info) ? str(info.name) || (isRecord(info.guild) ? str(info.guild.name) : "") : "";
  const drafts: DraftMessage[] = rows.map((row, index) => ({
    key: str(row.ID ?? row.id) || String(index),
    replyToKey: null,
    time: parseDiscordDate(str(row.Timestamp ?? row.timestamp)),
    author: "You",
    text: str(row.Contents ?? row.contents),
    attachments: attachmentsFromUrls(str(row.Attachments ?? row.attachments)),
    reactions: [],
    system: false,
  }));
  return {
    ...chat(drafts, format, title || null),
    warnings: ["Discord's data package only includes messages you sent, so other people's messages are missing."],
  };
}

function fromExporterCsv(records: Record<string, string>[]): ParsedChat {
  const drafts: DraftMessage[] = records.map((row, index) => ({
    key: String(index),
    replyToKey: null,
    time: parseDiscordDate(row.date),
    author: row.author || null,
    text: row.content ?? "",
    attachments: attachmentsFromUrls(row.attachments ?? ""),
    reactions: reactionsFromCsv(row.reactions ?? ""),
    system: false,
  }));
  return chat(drafts, "Discord · DiscordChatExporter CSV", null);
}

function chat(drafts: DraftMessage[], formatLabel: string, title: string | null): ParsedChat {
  return { source: "discord", formatLabel, title: title || null, messages: finalizeMessages(drafts), timeQuality: "exact", warnings: [] };
}

function isExporterJson(data: unknown): data is Record<string, unknown> {
  return isRecord(data) && isRecord(data.channel) && Array.isArray(data.messages);
}

function csvKind(file: SourceFile): "exporter" | "package" | null {
  const header = file.text.replace(/^\ufeff/, "").split(/\r?\n/, 1)[0].toLowerCase();
  if (/authorid/.test(header) && /content/.test(header)) return "exporter";
  if (/^"?id"?,"?timestamp"?,"?contents"?/.test(header)) return "package";
  return null;
}

export const discordAdapter: ChatAdapter = {
  id: "discord",
  label: "Discord",
  detect(files) {
    for (const file of files) {
      if (file.path.endsWith(".csv") && csvKind(file)) return 0.9;
      if (file.path.endsWith(".json")) {
        const head = file.text.slice(0, 3000);
        if (/"guild"\s*:/.test(head) && /"channel"\s*:/.test(head)) return 0.95;
        if (/"ID"\s*:/.test(head) && /"Contents"\s*:/.test(head)) return 0.85;
      }
    }
    return 0;
  },
  parse(files) {
    const chats: ParsedChat[] = [];
    for (const file of files) {
      if (file.path.endsWith(".csv")) {
        const kind = csvKind(file);
        const records = kind ? csvRecords(file.text) : [];
        if (kind === "exporter") chats.push(fromExporterCsv(records));
        if (kind === "package") {
          const rows = records.map((r) => ({ ID: r.id, Timestamp: r.timestamp, Contents: r.contents, Attachments: r.attachments }));
          const dir = file.path.slice(0, file.path.lastIndexOf("/") + 1);
          chats.push(fromDataPackage(rows, files.find((f) => f.path === `${dir}channel.json`), "Discord · data package CSV"));
        }
        continue;
      }
      if (!file.path.endsWith(".json") || /(^|\/)channel\.json$/.test(file.path)) continue;
      const data = parseJsonSafe(file.text);
      if (isExporterJson(data)) chats.push(fromExporterJson(data));
      else if (Array.isArray(data) && isRecord(data[0]) && "Contents" in data[0]) {
        const dir = file.path.slice(0, file.path.lastIndexOf("/") + 1);
        chats.push(fromDataPackage(data.filter(isRecord), files.find((f) => f.path === `${dir}channel.json`), "Discord · data package JSON"));
      }
    }
    const nonEmpty = chats.filter((c) => c.messages.length > 0);
    if (!nonEmpty.length) throw new ParseError("No Discord messages were found in this export.");
    return nonEmpty.sort((a, b) => b.messages.length - a.messages.length);
  },
};
