import type { Message } from "../chat/types";
import { maskSensitive } from "./mask";

export const PSEUDONYM_RE = /^Member \d{1,5}$/;

/** Real name -> "Member N", numbered by first appearance. Kept in the browser, never sent. */
export type PseudonymMap = Map<string, string>;

const COMMON_WORDS = new Set([
  "the", "and", "you", "bro", "sir", "mam", "maam", "madam", "miss", "mr", "mrs", "dr", "prof", "team",
  "class", "group", "admin", "official", "college", "hostel", "cse", "ece", "mech", "year", "batch",
  "new", "old", "home", "work", "office", "mom", "dad", "akka", "anna", "bhai", "didi", "ji",
]);

export function buildPseudonyms(messages: Message[]): PseudonymMap {
  const map: PseudonymMap = new Map();
  for (const message of messages) {
    if (message.author && !map.has(message.author)) map.set(message.author, `Member ${map.size + 1}`);
  }
  return map;
}

function nameTokens(name: string): string[] {
  return name
    .normalize("NFC")
    .split(/[^\p{L}\p{M}'’]+/u)
    .filter((token) => token.length >= 3 && !COMMON_WORDS.has(token.toLowerCase()));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds every way a member's name can show up inside messages: the full display name and each
 * distinctive part of it ("Priya Raman" -> "Priya Raman", "Priya", "Raman"). A part shared by two
 * members (two "Rahul"s) maps to neither, so it can't point at the wrong person.
 */
export function buildNameReplacer(pseudonyms: PseudonymMap): (text: string) => string {
  const variants = new Map<string, string | null>();
  for (const [name, pseudonym] of pseudonyms) {
    const full = name.normalize("NFC").trim();
    if (full.length >= 2) variants.set(full.toLowerCase(), pseudonym);
    for (const token of nameTokens(full)) {
      const key = token.toLowerCase();
      const existing = variants.get(key);
      variants.set(key, existing === undefined || existing === pseudonym ? pseudonym : null);
    }
  }
  const usable = [...variants.entries()].filter((entry): entry is [string, string] => entry[1] !== null);
  if (!usable.length) return (text) => text;
  const alternation = usable
    .map(([variant]) => variant)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])@?(${alternation})(?![\\p{L}\\p{M}\\p{N}])`, "giu");
  const lookup = new Map(usable);
  return (text) =>
    text.normalize("NFC").replace(pattern, (match, variant: string) => {
      const pseudonym = lookup.get(variant.toLowerCase());
      if (!pseudonym) return match;
      return match.startsWith("@") ? `@${pseudonym}` : pseudonym;
    });
}

export interface SanitizedChat {
  messages: Message[];
  pseudonyms: PseudonymMap;
}

/** Pseudonymises authors and names in text, then masks phones, emails and UPI ids. */
export function sanitizeMessages(messages: Message[]): SanitizedChat {
  const pseudonyms = buildPseudonyms(messages);
  const replaceNames = buildNameReplacer(pseudonyms);
  // Mask first: replacing "diya" inside "diya.nair@example.com" would hide the email from the masker.
  const clean = (text: string) => replaceNames(maskSensitive(text));
  const sanitized = messages.map((m) => ({
    ...m,
    author: m.author ? (pseudonyms.get(m.author) ?? "Member ?") : null,
    text: clean(m.text),
    attachments: m.attachments.map((a) => (a.name ? { ...a, name: clean(a.name) } : a)),
    poll: m.poll && {
      ...m.poll,
      question: clean(m.poll.question),
      options: m.poll.options.map((o) => ({ ...o, text: clean(o.text) })),
    },
  }));
  return { messages: sanitized, pseudonyms };
}
