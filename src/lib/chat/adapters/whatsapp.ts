import { finalizeMessages, baseName, type DraftMessage } from "../finalize";
import { attachmentKindFromName } from "../text";
import type { Attachment, ChatAdapter, ParsedChat, Poll, SourceFile } from "../types";
import { ParseError } from "../types";

const DATE = String.raw`(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})`;
const TIME = String.raw`(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?(?:[\s\u202f\u00a0]*([AaPp])\.?\s?[Mm]\.?)?`;
const ANDROID_HEADER = new RegExp(String.raw`^${DATE},?\s+${TIME}\s*[-–]\s(.*)$`);
const IPHONE_HEADER = new RegExp(String.raw`^\[${DATE},?\s+${TIME}\]\s?(.*)$`);
const DIRECTION_MARKS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

// Lines WhatsApp writes itself. The `[^:]` prefix keeps "Name: I left early" from matching.
const SYSTEM_PATTERNS = [
  /^messages (and calls )?(to this group )?are (now )?end-to-end encrypted/i,
  /^[^:]{1,80}? (created group|created this group|added|removed|left|joined using this group's invite link|joined from the community|was added)\b/i,
  /^[^:]{1,80}? changed (the subject|this group's icon|the group description|the group name|their phone number|to)\b/i,
  /^[^:]{1,80}? (deleted this group's icon|pinned a message|turned (on|off) disappearing messages|changed the settings)/i,
  /^(your )?security code (with .+ )?changed/i,
  /^you('re| are) now an admin/i,
  /^[^:]{1,80}? (started|ended) a (video |voice )?call/i,
  /^(missed (voice|video) call|disappearing messages (were|are) turned)/i,
  /^this (group|chat) (is|was) (with|now)/i,
];

const OMITTED: Record<string, Attachment["kind"]> = {
  "<media omitted>": "other",
  "image omitted": "image",
  "video omitted": "video",
  "audio omitted": "audio",
  "sticker omitted": "sticker",
  "gif omitted": "gif",
  "document omitted": "document",
  "contact card omitted": "contact",
  "<view once voice message omitted>": "audio",
  "null": "other",
};

interface Header {
  dateParts: [number, number, number];
  hour: number;
  minute: number;
  second: number;
  meridiem: "a" | "p" | null;
  body: string;
}

type DateOrder = "DMY" | "MDY" | "YMD";
type Platform = "Android" | "iPhone";

function matchHeader(line: string, platform: Platform): Header | null {
  const match = (platform === "Android" ? ANDROID_HEADER : IPHONE_HEADER).exec(line);
  if (!match) return null;
  const [, a, b, c, h, m, s, ampm, body] = match;
  return {
    dateParts: [Number(a), Number(b), Number(c)],
    hour: Number(h),
    minute: Number(m),
    second: s ? Number(s) : 0,
    meridiem: ampm ? (ampm.toLowerCase() as "a" | "p") : null,
    body,
  };
}

function cleanLine(line: string): string {
  return line.replace(/^[\u200e\u200f\ufeff]+/, "");
}

function detectPlatform(lines: string[]): { platform: Platform; hits: number; sampled: number } {
  let android = 0;
  let iphone = 0;
  let sampled = 0;
  for (const raw of lines) {
    const line = cleanLine(raw);
    if (!line.trim()) continue;
    sampled++;
    if (IPHONE_HEADER.test(line)) iphone++;
    else if (ANDROID_HEADER.test(line)) android++;
    if (sampled >= 200) break;
  }
  return iphone > android
    ? { platform: "iPhone", hits: iphone, sampled }
    : { platform: "Android", hits: android, sampled };
}

function toDate(parts: [number, number, number], order: DateOrder): { y: number; mo: number; d: number } {
  const [a, b, c] = parts;
  const year = (n: number) => (n < 100 ? 2000 + n : n);
  if (order === "YMD") return { y: year(a), mo: b, d: c };
  if (order === "MDY") return { y: year(c), mo: a, d: b };
  return { y: year(c), mo: b, d: a };
}

function headerTime(header: Header, order: DateOrder): number {
  const { y, mo, d } = toDate(header.dateParts, order);
  let hour = header.hour;
  if (header.meridiem === "p" && hour < 12) hour += 12;
  if (header.meridiem === "a" && hour === 12) hour = 0;
  return new Date(y, mo - 1, d, hour, header.minute, header.second).getTime();
}

/** Picks DD/MM vs MM/DD: impossible values decide first, then whichever keeps time moving forward. */
export function detectDateOrder(headers: Header[]): { order: DateOrder; certain: boolean } {
  if (headers.some((h) => h.dateParts[0] > 31)) return { order: "YMD", certain: true };
  if (headers.some((h) => h.dateParts[0] > 12)) return { order: "DMY", certain: true };
  if (headers.some((h) => h.dateParts[1] > 12)) return { order: "MDY", certain: true };
  const backwardsJumps = (order: DateOrder) => {
    let jumps = 0;
    for (let i = 1; i < headers.length; i++) {
      if (headerTime(headers[i], order) < headerTime(headers[i - 1], order)) jumps++;
    }
    return jumps;
  };
  const dmy = backwardsJumps("DMY");
  const mdy = backwardsJumps("MDY");
  if (mdy < dmy) return { order: "MDY", certain: true };
  return { order: "DMY", certain: dmy < mdy };
}

function parsePoll(text: string): Poll | undefined {
  const lines = text.split("\n").map((l) => l.replace(DIRECTION_MARKS, "").trim());
  if (!/^POLL:$/i.test(lines[0] ?? "")) return undefined;
  const question = lines[1] ?? "";
  const options = lines
    .slice(2)
    .map((line) => /^OPTION:\s*(.+?)(?:\s*\((\d+) votes?\))?$/i.exec(line))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ text: m[1], votes: m[2] ? Number(m[2]) : null }));
  return question ? { question, options } : undefined;
}

function readAttachments(text: string): { text: string; attachments: Attachment[] } {
  const attachments: Attachment[] = [];
  let rest = text;

  const omitted = OMITTED[rest.trim().toLowerCase()];
  if (omitted) return { text: "", attachments: [{ kind: omitted, omitted: true }] };

  rest = rest.replace(/<attached:\s*([^>]+)>/gi, (_, name: string) => {
    const fileName = name.trim().replace(/^\d{8}-/, "");
    attachments.push({ kind: attachmentKindFromName(fileName), name: fileName });
    return "";
  });
  rest = rest.replace(/^(.+?\.\w{2,5}) \(file attached\)/gim, (_, name: string) => {
    attachments.push({ kind: attachmentKindFromName(name), name: name.trim() });
    return "";
  });
  // iPhone writes "Notes.pdf • 3 pages" before the attachment tag; that line is the file, not text.
  rest = rest.replace(/^.+\.\w{2,5}\s•\s.+$/m, "");
  if (/^location: https?:\/\//i.test(rest.trim())) attachments.push({ kind: "location" });
  return { text: rest.trim(), attachments };
}

function splitAuthor(body: string): { author: string | null; text: string; system: boolean } {
  if (SYSTEM_PATTERNS.some((p) => p.test(body.replace(DIRECTION_MARKS, "")))) {
    return { author: null, text: body.replace(DIRECTION_MARKS, ""), system: true };
  }
  const match = /^([^:\n]{1,80}?):(?: ([\s\S]*))?$/.exec(body);
  if (!match) return { author: null, text: body.replace(DIRECTION_MARKS, ""), system: true };
  const author = match[1].replace(DIRECTION_MARKS, "").trim();
  const rawText = match[2] ?? "";
  // iPhone attributes system lines to the group name, marked with a leading direction mark.
  const marked = rawText.startsWith("\u200e");
  const text = rawText.replace(DIRECTION_MARKS, "");
  if (marked && SYSTEM_PATTERNS.some((p) => p.test(text))) return { author: null, text, system: true };
  return { author, text, system: false };
}

function titleFromPath(path: string): string | null {
  const name = baseName(path).replace(/\.(txt|zip)$/i, "");
  const match = /^WhatsApp Chat (?:with|-) (.+)$/i.exec(name);
  return match ? match[1].trim() : null;
}

function chatFile(files: SourceFile[]): SourceFile | undefined {
  const texts = files.filter((f) => /\.txt$/i.test(f.path) || !/\.\w+$/.test(f.path));
  return texts
    .map((file) => ({ file, score: detectPlatform(file.text.split(/\r?\n/, 300)).hits }))
    .sort((a, b) => b.score - a.score)[0]?.file;
}

export function parseWhatsAppText(text: string, path = "chat.txt"): ParsedChat {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const { platform, hits } = detectPlatform(lines);
  if (hits === 0) throw new ParseError("This doesn't look like a WhatsApp export.");

  const blocks: Header[] = [];
  for (const raw of lines) {
    const line = cleanLine(raw);
    const header = matchHeader(line, platform);
    if (header) blocks.push(header);
    else if (blocks.length) blocks[blocks.length - 1].body += `\n${raw.replace(DIRECTION_MARKS, "")}`;
  }

  const { order, certain } = detectDateOrder(blocks);
  const twelveHour = blocks.some((b) => b.meridiem !== null);

  const drafts: DraftMessage[] = blocks.map((block, index) => {
    const { author, text: body, system } = splitAuthor(block.body.trimEnd());
    const edited = /\s*<This message was edited>\s*$/i;
    const { text: withoutMedia, attachments } = system
      ? { text: body, attachments: [] }
      : readAttachments(body.replace(edited, ""));
    const poll = system ? undefined : parsePoll(withoutMedia);
    return {
      key: String(index),
      replyToKey: null,
      time: headerTime(block, order),
      author,
      text: poll ? poll.question : withoutMedia,
      attachments,
      reactions: [],
      system,
      poll,
    };
  });

  const orderLabel = order === "YMD" ? "YYYY-MM-DD" : order === "DMY" ? "DD/MM" : "MM/DD";
  const warnings = certain
    ? []
    : ["Every date in this export fits both DD/MM and MM/DD. CatchUp assumed DD/MM."];

  return {
    source: "whatsapp",
    formatLabel: `WhatsApp · ${platform} · ${twelveHour ? "12-hour" : "24-hour"} · ${orderLabel}`,
    title: titleFromPath(path),
    messages: finalizeMessages(drafts),
    timeQuality: "exact",
    warnings,
  };
}

export const whatsappAdapter: ChatAdapter = {
  id: "whatsapp",
  label: "WhatsApp",
  detect(files) {
    const file = chatFile(files);
    if (!file) return 0;
    const { hits, sampled } = detectPlatform(file.text.split(/\r?\n/, 300));
    if (!sampled || !hits) return 0;
    const ratio = hits / sampled;
    const named = /whatsapp|_chat\.txt$/i.test(file.path) ? 0.1 : 0;
    return Math.min(1, 0.5 + ratio * 0.4 + named);
  },
  parse(files) {
    const file = chatFile(files);
    if (!file) throw new ParseError("No WhatsApp chat text file was found.");
    return [parseWhatsAppText(file.text, file.path)];
  },
};
