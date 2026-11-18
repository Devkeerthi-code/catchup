import type { PollOption, SourceId } from "../chat/types";
import type { Insights } from "../insights";

export type ItemType = "decision" | "deadline" | "link" | "question" | "poll" | "file";

interface ItemBase {
  /** "d1", "e2", "l3"... unique within one catch-up. */
  id: string;
  type: ItemType;
  /** Message ids this item came from, oldest first. */
  sourceIds: string[];
  /** Time of the first source message, used to place it on the day timeline. */
  at: number;
}

export interface DecisionItem extends ItemBase {
  type: "decision";
  text: string;
}

export interface DeadlineItem extends ItemBase {
  type: "deadline";
  title: string;
  date: string | null;
  time: string | null;
  place: string | null;
  /** Later messages that changed it, e.g. "Venue: LH-2 → Seminar Hall". */
  changes: string[];
}

export interface LinkItem extends ItemBase {
  type: "link";
  url: string;
  domain: string;
  shares: number;
}

export interface QuestionItem extends ItemBase {
  type: "question";
  question: string;
  askedBy: string | null;
}

export interface PollItem extends ItemBase {
  type: "poll";
  question: string;
  options: PollOption[];
  result: string | null;
  closed: boolean;
}

export interface FileItem extends ItemBase {
  type: "file";
  name: string;
}

export type CatchUpItem = DecisionItem | DeadlineItem | LinkItem | QuestionItem | PollItem | FileItem;

export interface TldrLine {
  text: string;
  sourceIds: string[];
}

export interface CatchUpStats {
  messagesRead: number;
  noiseRemoved: number;
  minutesSaved: number;
  signalItems: number;
}

/** The whole result. Contains no chat text: quotes for source cards live only on the device. */
export interface CatchUp {
  version: 1;
  id: string;
  title: string;
  source: SourceId;
  formatLabel: string;
  createdAt: number;
  range: { from: number; to: number };
  stats: CatchUpStats;
  tldr: TldrLine[];
  decisions: DecisionItem[];
  deadlines: DeadlineItem[];
  links: LinkItem[];
  files: FileItem[];
  questions: QuestionItem[];
  polls: PollItem[];
  insights: Insights;
  warnings: string[];
}

/** A pseudonymised message kept on the device to show "Open in context". */
export interface QuoteMessage {
  id: string;
  time: number;
  author: string | null;
  text: string;
  system: boolean;
}
