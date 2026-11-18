/**
 * On-device helpers for displaying pseudonymised text: swapping "Member N" back to a real name
 * (only when the user asks, from the map kept in this browser) and finding masked tokens.
 */

const MEMBER = /\bMember \d{1,5}\b/g;

export type NameMap = ReadonlyMap<string, string>;

/** From [real, pseudonym] pairs to pseudonym → real. */
export function pseudonymLookup(pairs: [string, string][] | null | undefined): NameMap {
  return new Map((pairs ?? []).map(([real, pseudo]) => [pseudo, real]));
}

export function revealNames(text: string, names: NameMap | null): string {
  if (!names || !names.size) return text;
  return text.replace(MEMBER, (match) => names.get(match) ?? match);
}

export type MaskedPiece = { kind: "text"; text: string } | { kind: "masked"; label: string };

const MASK_TOKEN = /\[(phone|email|upi-id|masked)\]/g;
const MASK_LABELS: Record<string, string> = {
  phone: "phone hidden",
  email: "email hidden",
  "upi-id": "UPI ID hidden",
  masked: "hidden",
};

/** Splits sanitised text so masked tokens can be shown as chips instead of raw brackets. */
export function splitMasked(text: string): MaskedPiece[] {
  const pieces: MaskedPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(MASK_TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) pieces.push({ kind: "text", text: text.slice(last, start) });
    pieces.push({ kind: "masked", label: MASK_LABELS[match[1]] });
    last = start + match[0].length;
  }
  if (last < text.length) pieces.push({ kind: "text", text: text.slice(last) });
  return pieces;
}

/** "Member 12" → "12", for the small avatar circle. Real names → initials. */
export function avatarLabel(name: string | null): string {
  if (!name) return "·";
  const member = /^Member (\d+)$/.exec(name);
  if (member) return member[1];
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
