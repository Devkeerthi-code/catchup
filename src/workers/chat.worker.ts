/// <reference lib="webworker" />
import { chatFromTranscript } from "@/lib/chat/adapters/screenshot";
import { parsePlainText } from "@/lib/chat/adapters/plaintext";
import { parseExport } from "@/lib/chat/registry";
import type { ParsedChat } from "@/lib/chat/types";
import { ParseError } from "@/lib/chat/types";
import { unpackUploads } from "@/lib/chat/unpack";
import { overview, prepareChat } from "@/lib/client/prepare";
import type { WorkerRequest, WorkerResponse } from "./protocol";

/**
 * Runs parsing, range filtering, pseudonymisation, masking, insights and chunking off the main
 * thread, so a 50,000-message export doesn't freeze the page. The raw chat stays in here.
 */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let chats: ParsedChat[] = [];

function reply(message: WorkerResponse): void {
  scope.postMessage(message);
}

function parse(request: WorkerRequest): ParsedChat[] {
  switch (request.type) {
    case "parseFiles":
      return parseExport(unpackUploads(request.uploads.map((u) => ({ name: u.name, bytes: new Uint8Array(u.buffer) }))));
    case "parseText": {
      const files = [{ path: "pasted.txt", text: request.text }];
      try {
        return parseExport(files);
      } catch {
        return [parsePlainText(request.text)];
      }
    }
    case "parseTranscript":
      return [chatFromTranscript(request.transcript)];
    default:
      return chats;
  }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  const started = performance.now();
  try {
    if (request.type === "prepare") {
      const chat = chats[request.chatIndex];
      if (!chat) throw new ParseError("That chat is no longer loaded. Drop the file in again.");
      reply({ id: request.id, type: "prepared", prepared: prepareChat(chat, request.range), durationMs: performance.now() - started });
      return;
    }
    chats = parse(request);
    reply({ id: request.id, type: "parsed", chats: chats.map(overview), durationMs: performance.now() - started });
  } catch (error) {
    const message =
      error instanceof ParseError ? error.message : "Something went wrong while reading this file. Try exporting the chat again.";
    if (!(error instanceof ParseError)) console.error(error);
    reply({ id: request.id, type: "error", message });
  }
};
