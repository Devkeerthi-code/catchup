/** The one shape every chat app is converted into. Adapters must produce this and nothing else. */

export type AttachmentKind =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "gif"
  | "contact"
  | "location"
  | "other";

export interface Attachment {
  kind: AttachmentKind;
  /** File name when the export has one, e.g. "Unit3_notes.pdf". */
  name?: string;
  /** True when the export says the media was left out ("<Media omitted>"). */
  omitted?: boolean;
}

export interface Reaction {
  emoji: string;
  count: number;
}

export interface PollOption {
  text: string;
  votes: number | null;
}

export interface Poll {
  question: string;
  options: PollOption[];
  closed?: boolean;
}

export interface Message {
  /** Stable within one parsed chat: "m1", "m2", ... in time order. */
  id: string;
  /** Epoch milliseconds. Wall-clock exports (WhatsApp) are read in the device's time zone. */
  time: number;
  /** Display name as it appears in the export. Null for system messages with no actor. */
  author: string | null;
  text: string;
  /** Id (in this chat) of the message this one replies to or sits under in a thread. */
  replyTo: string | null;
  attachments: Attachment[];
  reactions: Reaction[];
  /** Joins, leaves, subject changes, encryption notices and other app-generated lines. */
  system: boolean;
  forwarded?: boolean;
  poll?: Poll;
}

export type SourceId =
  | "whatsapp"
  | "telegram"
  | "slack"
  | "discord"
  | "meta"
  | "plaintext"
  | "screenshot";

export interface ParsedChat {
  source: SourceId;
  /** Human label of what was detected, e.g. "WhatsApp · iPhone · 12-hour · DD/MM". */
  formatLabel: string;
  title: string | null;
  messages: Message[];
  /** "exact" when the export has timestamps; "estimated" for pasted text without times. */
  timeQuality: "exact" | "estimated";
  warnings: string[];
}

/** A text file handed to adapters. Zips are unpacked into these before detection. */
export interface SourceFile {
  /** Path inside the archive, or the file name. Forward slashes. */
  path: string;
  text: string;
}

export interface ChatAdapter {
  id: SourceId;
  label: string;
  /** Confidence 0..1 that these files are this app's export. Must be cheap: look, don't parse. */
  detect(files: SourceFile[]): number;
  /** One export can hold several conversations (Slack channels, Meta threads). */
  parse(files: SourceFile[]): ParsedChat[];
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
