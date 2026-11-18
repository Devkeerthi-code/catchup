import { discordAdapter } from "./adapters/discord";
import { metaAdapter } from "./adapters/meta";
import { plaintextAdapter } from "./adapters/plaintext";
import { slackAdapter } from "./adapters/slack";
import { telegramAdapter } from "./adapters/telegram";
import { whatsappAdapter } from "./adapters/whatsapp";
import type { ChatAdapter, ParsedChat, SourceFile } from "./types";
import { ParseError } from "./types";

/**
 * Supporting a new app = write an adapter (detect + parse into Message) and add it here.
 * Order only breaks ties; the highest detect() score wins.
 */
export const ADAPTERS: readonly ChatAdapter[] = [
  whatsappAdapter,
  telegramAdapter,
  slackAdapter,
  discordAdapter,
  metaAdapter,
  plaintextAdapter,
];

export interface Detection {
  adapter: ChatAdapter;
  confidence: number;
}

export function detectFormat(files: SourceFile[]): Detection | null {
  let best: Detection | null = null;
  for (const adapter of ADAPTERS) {
    const confidence = adapter.detect(files);
    if (confidence > (best?.confidence ?? 0)) best = { adapter, confidence };
  }
  return best;
}

export function parseExport(files: SourceFile[]): ParsedChat[] {
  if (!files.length) throw new ParseError("No readable chat files were found. Export the chat as text or JSON, then try again.");
  const detection = detectFormat(files);
  if (!detection) {
    throw new ParseError("CatchUp couldn't recognise this file. Try a WhatsApp .txt/.zip, a Telegram, Slack, Discord or Instagram/Messenger export, or paste the text.");
  }
  const chats = detection.adapter.parse(files).filter((c) => c.messages.length > 0);
  if (!chats.length) throw new ParseError("The export was recognised but has no messages in it.");
  return chats;
}
