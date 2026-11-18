import { finalizeMessages, type DraftMessage } from "../finalize";
import type { ChatAdapter, ParsedChat } from "../types";
import { ParseError } from "../types";

const CLOCK = String.raw`(\d{1,2})[:.](\d{2})(?:\s?([AaPp])\.?[Mm]\.?)?`;

interface LineShape {
  name: string;
  pattern: RegExp;
  read(m: RegExpExecArray): { author: string; clock: string[] | null; text: string };
}

// Common copy-paste shapes from apps without an export. The shape matching most lines wins.
const SHAPES: LineShape[] = [
  {
    name: "[time] Name: text",
    pattern: new RegExp(String.raw`^\[?${CLOCK}\]?\s*[-–]?\s*([^:\[\]]{1,40}):\s+(.+)$`),
    read: (m) => ({ author: m[4], clock: [m[1], m[2], m[3]], text: m[5] }),
  },
  {
    name: "Name (time): text",
    pattern: new RegExp(String.raw`^([^:\[\]()]{1,40}?)\s*[\[(]${CLOCK}[\])]\s*:?\s+(.+)$`),
    read: (m) => ({ author: m[1], clock: [m[2], m[3], m[4]], text: m[5] }),
  },
  {
    name: "Name: text",
    pattern: /^([^:\n]{1,40}?):\s+(.+)$/,
    read: (m) => ({ author: m[1], clock: null, text: m[2] }),
  },
];

function minutesOf(clock: string[]): number {
  let hour = Number(clock[0]);
  const meridiem = clock[2]?.toLowerCase();
  if (meridiem === "p" && hour < 12) hour += 12;
  if (meridiem === "a" && hour === 12) hour = 0;
  return hour * 60 + Number(clock[1]);
}

function bestShape(lines: string[]): { shape: LineShape | null; hits: number } {
  let best: { shape: LineShape | null; hits: number } = { shape: null, hits: 0 };
  for (const shape of SHAPES) {
    const hits = lines.filter((l) => shape.pattern.test(l)).length;
    if (hits > best.hits) best = { shape, hits };
  }
  return best;
}

/**
 * Best effort for pasted text. Times without dates are placed on `now`'s day, stepping a day back
 * each time the clock wraps; without any times, messages are spaced one minute apart ending now.
 */
export function parsePlainText(text: string, now = Date.now()): ParsedChat {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd());
  const nonEmpty = lines.filter((l) => l.trim());
  if (!nonEmpty.length) throw new ParseError("There's no text to read.");
  const { shape, hits } = bestShape(nonEmpty);
  const useShape = shape && hits / nonEmpty.length >= 0.3 ? shape : null;

  const parsed: { author: string | null; clock: string[] | null; text: string }[] = [];
  for (const line of nonEmpty) {
    const m = useShape?.pattern.exec(line);
    if (m && useShape) parsed.push(useShape.read(m));
    else if (useShape && parsed.length) parsed[parsed.length - 1].text += `\n${line}`;
    else parsed.push({ author: null, clock: null, text: line.trim() });
  }

  const hasClock = parsed.some((p) => p.clock);
  const minutes = parsed.map((p) => (p.clock ? minutesOf(p.clock) : null));
  const dayOffsets = new Array<number>(parsed.length).fill(0);
  let wraps = 0;
  let previous = -1;
  minutes.forEach((value, i) => {
    if (value !== null) {
      if (value < previous) wraps++;
      previous = value;
    }
    dayOffsets[i] = wraps;
  });

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let lastKnown = 0;
  const drafts: DraftMessage[] = parsed.map((p, i) => {
    let time: number;
    if (hasClock) {
      const value = minutes[i] ?? lastKnown;
      lastKnown = value;
      time = today.getTime() - (wraps - dayOffsets[i]) * 86_400_000 + value * 60_000 + i;
    } else {
      time = now - (parsed.length - i) * 60_000;
    }
    return {
      key: String(i),
      replyToKey: null,
      time,
      author: p.author?.trim() || null,
      text: p.text.trim(),
      attachments: [],
      reactions: [],
      system: false,
    };
  });

  return {
    source: "plaintext",
    formatLabel: useShape ? `Pasted text · "${useShape.name}"` : "Pasted text · one message per line",
    title: null,
    messages: finalizeMessages(drafts),
    timeQuality: "estimated",
    warnings: hasClock
      ? ["Pasted text has times but no dates, so dates are estimated."]
      : ["Pasted text has no times, so the timeline and busiest hours are estimates."],
  };
}

export const plaintextAdapter: ChatAdapter = {
  id: "plaintext",
  label: "Pasted text",
  // The fallback: any single text file can be read line by line.
  detect(files) {
    return files.length === 1 && files[0].text.trim() && !/^\s*(\{|\[\s*\{)/.test(files[0].text) ? 0.15 : 0;
  },
  parse(files) {
    return [parsePlainText(files[0]?.text ?? "")];
  },
};
