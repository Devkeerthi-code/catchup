import { applyRange, authorsByActivity, type RangeSpec } from "../chat/range";
import { isNoise } from "../chat/text";
import type { Message, ParsedChat } from "../chat/types";
import { computeInsights, type Insights } from "../insights";
import { sanitizeMessages } from "../privacy/pseudonymize";
import { chunkMessages, MAX_CHUNKS_PER_RUN, toPayloadMessage, type PayloadChunk } from "../summary/chunk";

/** What the import screen shows about each conversation found in an export. */
export interface ChatOverview {
  index: number;
  title: string | null;
  formatLabel: string;
  source: ParsedChat["source"];
  messageCount: number;
  firstTime: number;
  lastTime: number;
  /** Real names, for the "who are you?" picker. Shown only on this device. */
  authors: { name: string; count: number }[];
  warnings: string[];
  timeQuality: ParsedChat["timeQuality"];
}

export function overview(chat: ParsedChat, index: number): ChatOverview {
  return {
    index,
    title: chat.title,
    formatLabel: chat.formatLabel,
    source: chat.source,
    messageCount: chat.messages.length,
    firstTime: chat.messages[0]?.time ?? 0,
    lastTime: chat.messages[chat.messages.length - 1]?.time ?? 0,
    authors: authorsByActivity(chat.messages).slice(0, 50),
    warnings: chat.warnings,
    timeQuality: chat.timeQuality,
  };
}

/** Everything needed to run the summary, all already pseudonymised and masked. */
export interface PreparedChat {
  /** Sanitised messages in the chosen range. Never leave the device except as chunk payloads. */
  messages: Message[];
  chunks: PayloadChunk[];
  insights: Insights;
  /** [real name, pseudonym] pairs for the on-device "show real names" toggle. */
  pseudonyms: [string, string][];
  signalCount: number;
  rangeNote: string | null;
  /** Set when the range is too big for one run on the free AI quota. */
  tooLarge: { chunks: number; max: number } | null;
}

export function prepareChat(chat: ParsedChat, range: RangeSpec): PreparedChat {
  const { messages: inRange, note } = applyRange(chat.messages, range);
  const { messages, pseudonyms } = sanitizeMessages(inRange);
  const signal = messages.filter((m) => !isNoise(m));
  const chunks = chunkMessages(signal.map(toPayloadMessage));
  return {
    messages,
    chunks,
    insights: computeInsights(messages, chat.timeQuality),
    pseudonyms: [...pseudonyms.entries()],
    signalCount: signal.length,
    rangeNote: note,
    tooLarge: chunks.length > MAX_CHUNKS_PER_RUN ? { chunks: chunks.length, max: MAX_CHUNKS_PER_RUN } : null,
  };
}
