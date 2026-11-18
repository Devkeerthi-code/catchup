import type { Transcript } from "@/lib/chat/adapters/screenshot";
import type { RangeSpec } from "@/lib/chat/range";
import type { ChatOverview, PreparedChat } from "@/lib/client/prepare";

export type WorkerRequest =
  | { id: number; type: "parseFiles"; uploads: { name: string; buffer: ArrayBuffer }[] }
  | { id: number; type: "parseText"; text: string }
  | { id: number; type: "parseTranscript"; transcript: Transcript }
  | { id: number; type: "prepare"; chatIndex: number; range: RangeSpec };

export type WorkerResponse =
  | { id: number; type: "parsed"; chats: ChatOverview[]; durationMs: number }
  | { id: number; type: "prepared"; prepared: PreparedChat; durationMs: number }
  | { id: number; type: "error"; message: string };
