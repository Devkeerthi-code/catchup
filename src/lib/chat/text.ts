import type { AttachmentKind, Message } from "./types";

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING_PUNCT = /[.,;:!?)\]}'"»”’]+$/;

/** Every URL in a piece of text, with trailing sentence punctuation removed. */
export function extractUrls(text: string): string[] {
  const found = text.match(URL_RE) ?? [];
  return found.map((raw) => {
    let url = raw.replace(TRAILING_PUNCT, "");
    // Keep a closing bracket that belongs to the URL, e.g. Wikipedia "(disambiguation)".
    const opens = (url.match(/\(/g) ?? []).length;
    const closes = (url.match(/\)/g) ?? []).length;
    if (opens > closes && raw.length > url.length && raw[url.length] === ")") url += ")";
    return url;
  });
}

const TRACKING_PARAMS = /^(utm_\w+|fbclid|gclid|igsh|igshid|si|mc_cid|mc_eid|ref_src|feature|usp)$/i;

/** Canonical form used to deduplicate links shared several times in slightly different shapes. */
export function normalizeUrl(input: string): string {
  const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return input.trim().toLowerCase();
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return `youtube.com/watch?v=${id}`;
  }
  const params = [...url.searchParams.entries()]
    .filter(([key]) => !TRACKING_PARAMS.test(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";
  const path = url.pathname.replace(/\/+$/, "");
  return `${host}${path}${query}`;
}

export function domainOf(url: string): string {
  const normalized = normalizeUrl(url);
  return normalized.split(/[/?]/)[0];
}

const ACKS = new Set(
  [
    "ok", "okay", "okk", "okkk", "okie", "okies", "k", "kk", "hmm", "hm", "ya", "yaa", "yes", "yess",
    "yeah", "yep", "yup", "no", "nope", "lol", "lmao", "haha", "hahaha", "hehe", "thanks", "thank you",
    "thanku", "thx", "ty", "tq", "tysm", "sure", "done", "noted", "cool", "nice", "great", "good",
    "gm", "gn", "good morning", "good night", "same", "true", "right", "fine", "alright", "oh", "ohh",
    "oh ok", "ok ok", "wow", "yay", "ok sir", "ok mam", "ok ma'am", "thank you sir", "thank you mam",
    "thanks sir", "thanks mam", "noted sir", "seen", "+1", "agreed", "acha", "accha", "theek hai", "sari",
  ].map((s) => s.toLowerCase()),
);

const DELETED = /^(this message was deleted|you deleted this message|message deleted|this message has been deleted|[^:]{0,40} unsent a message)\.?$/i;
const EMOJI_OR_PUNCT_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Emoji_Component}\p{P}\p{S}\s\u200d\ufe0f]*$/u;
const NOISE_ATTACHMENTS = new Set<AttachmentKind>(["sticker", "gif", "image", "video", "audio"]);

/**
 * Noise = messages with nothing to catch up on: system lines, stickers, "ok"s, emoji-only replies,
 * deleted messages and captionless photos. They are counted, then left out of the AI request.
 */
export function isNoise(message: Message): boolean {
  if (message.system) return true;
  if (message.poll) return false;
  const text = message.text.trim();
  if (!text) {
    return message.attachments.every((a) => NOISE_ATTACHMENTS.has(a.kind) || a.omitted && !a.name);
  }
  if (DELETED.test(text)) return true;
  if (EMOJI_OR_PUNCT_ONLY.test(text)) return true;
  const normalized = text.toLowerCase().replace(/[!.?,~\s]+$/g, "").replace(/\s+/g, " ");
  return normalized.length <= 20 && ACKS.has(normalized);
}

const KIND_BY_EXT: Record<string, AttachmentKind> = {
  jpg: "image", jpeg: "image", png: "image", heic: "image", webp: "image",
  gif: "gif",
  mp4: "video", mov: "video", "3gp": "video", mkv: "video", webm: "video",
  opus: "audio", ogg: "audio", m4a: "audio", mp3: "audio", aac: "audio", wav: "audio",
  vcf: "contact",
  pdf: "document", doc: "document", docx: "document", ppt: "document", pptx: "document",
  xls: "document", xlsx: "document", csv: "document", txt: "document", zip: "document",
  rar: "document", apk: "document", odt: "document", key: "document",
};

export function attachmentKindFromName(name: string): AttachmentKind {
  if (/sticker/i.test(name)) return "sticker";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return KIND_BY_EXT[ext] ?? "other";
}

export function attachmentKindFromMime(mime: string | undefined, name = ""): AttachmentKind {
  if (!mime) return attachmentKindFromName(name);
  if (mime === "image/gif") return "gif";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

const FILE_MENTION_RE = /(?<![\w/.-])[\w\-()&+ ]{0,60}?[\w)]\.(pdf|docx?|pptx?|xlsx?|csv|zip|rar|odt|key|apk)\b/gi;

/** File names typed in message text, e.g. "uploaded Unit 3 notes.pdf to drive". */
export function extractFileMentions(text: string): string[] {
  const textWithoutUrls = text.replace(URL_RE, " ");
  return (textWithoutUrls.match(FILE_MENTION_RE) ?? []).map((m) => m.trim());
}
