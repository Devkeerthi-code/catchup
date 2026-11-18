import type { Transcript } from "../chat/adapters/screenshot";
import type { RangeSpec } from "../chat/range";
import type { WorkerRequest, WorkerResponse } from "@/workers/protocol";
import type { ChatOverview, PreparedChat } from "./prepare";

type Pending = { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Promise wrapper around the chat Web Worker. One worker holds one loaded export at a time. */
export class ChatWorker {
  private worker: Worker;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor() {
    this.worker = new Worker(new URL("../../workers/chat.worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const entry = this.pending.get(event.data.id);
      if (!entry) return;
      this.pending.delete(event.data.id);
      if (event.data.type === "error") entry.reject(new Error(event.data.message));
      else entry.resolve(event.data);
    };
    this.worker.onerror = (event) => {
      event.preventDefault();
      for (const entry of this.pending.values()) entry.reject(new Error("The file reader stopped unexpectedly. Reload the page and try again."));
      this.pending.clear();
    };
  }

  private send(request: DistributiveOmit<WorkerRequest, "id">, transfer: Transferable[] = []): Promise<WorkerResponse> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...request, id } as WorkerRequest, transfer);
    });
  }

  async parseFiles(files: File[]): Promise<{ chats: ChatOverview[]; durationMs: number }> {
    const uploads = await Promise.all(files.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })));
    const response = await this.send({ type: "parseFiles", uploads }, uploads.map((u) => u.buffer));
    return parsed(response);
  }

  async parseText(text: string): Promise<{ chats: ChatOverview[]; durationMs: number }> {
    return parsed(await this.send({ type: "parseText", text }));
  }

  async parseTranscript(transcript: Transcript): Promise<{ chats: ChatOverview[]; durationMs: number }> {
    return parsed(await this.send({ type: "parseTranscript", transcript }));
  }

  async prepare(chatIndex: number, range: RangeSpec): Promise<{ prepared: PreparedChat; durationMs: number }> {
    const response = await this.send({ type: "prepare", chatIndex, range });
    if (response.type !== "prepared") throw new Error("Unexpected reply from the file reader.");
    return { prepared: response.prepared, durationMs: response.durationMs };
  }

  /** Stops the worker; anything still waiting rejects with AbortError so callers can ignore it. */
  dispose(): void {
    this.worker.terminate();
    for (const entry of this.pending.values()) entry.reject(new DOMException("The file reader was closed.", "AbortError"));
    this.pending.clear();
  }
}

function parsed(response: WorkerResponse): { chats: ChatOverview[]; durationMs: number } {
  if (response.type !== "parsed") throw new Error("Unexpected reply from the file reader.");
  return { chats: response.chats, durationMs: response.durationMs };
}
