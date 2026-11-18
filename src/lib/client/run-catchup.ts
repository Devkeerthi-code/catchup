import type { Message } from "../chat/types";
import { assembleCatchUp, fallbackTldr, sourceIdsForItemIds, tldrInput } from "../summary/assemble";
import type { PayloadChunk } from "../summary/chunk";
import { mergeChunkSummaries } from "../summary/merge";
import { EMPTY_CHUNK_SUMMARY, type ChunkSummary } from "../summary/schema";
import type { CatchUp, TldrLine } from "../summary/types";
import { ApiClientError, apiFetch, trackUsage } from "./api";
import type { ChatOverview, PreparedChat } from "./prepare";

export type RunProgress =
  | { stage: "reading"; done: number; total: number }
  | { stage: "merging" }
  | { stage: "waiting"; seconds: number };

interface RunOptions {
  chat: ChatOverview;
  prepared: PreparedChat;
  onProgress: (progress: RunProgress) => void;
  signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Cancelled", "AbortError"));
    });
  });

/**
 * Sends one chunk; on a short rate-limit wait (free quota per minute) it waits and retries once,
 * showing a countdown. Longer waits are surfaced to the user as an error.
 */
async function summariseChunk(chunk: PayloadChunk, total: number, options: RunOptions): Promise<ChunkSummary> {
  for (let attempt = 0; ; attempt++) {
    try {
      const { summary } = await apiFetch<{ summary: ChunkSummary }>("/api/catchup/chunk", {
        method: "POST",
        json: { index: chunk.index, total, messages: chunk.messages },
        signal: options.signal,
      });
      return summary;
    } catch (error) {
      const retryable = error instanceof ApiClientError && [0, 429, 503, 504].includes(error.status);
      const wait = error instanceof ApiClientError ? Math.max(error.retryAfterSeconds, 5) : 0;
      if (!retryable || attempt >= 1 || wait > 75) throw error;
      for (let s = wait; s > 0; s--) {
        options.onProgress({ stage: "waiting", seconds: s });
        await sleep(1000, options.signal);
      }
    }
  }
}

async function writeTldr(merged: ReturnType<typeof mergeChunkSummaries>, signal?: AbortSignal): Promise<TldrLine[]> {
  const items = tldrInput(merged);
  if (!items.length) return [];
  try {
    const { lines } = await apiFetch<{ lines: { text: string; itemIds: string[] }[] }>("/api/catchup/tldr", {
      method: "POST",
      json: { items },
      signal,
    });
    const tldr = lines.map((l) => ({ text: l.text, sourceIds: sourceIdsForItemIds(l.itemIds, merged) })).filter((l) => l.sourceIds.length);
    return tldr.length ? tldr : fallbackTldr(merged);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    // The sections are already done; a TL;DR built from highlights beats failing the whole run.
    return fallbackTldr(merged);
  }
}

/** The map-reduce run: chunk summaries in order, then a local merge, then the TL;DR. */
export async function runCatchUp(options: RunOptions): Promise<CatchUp> {
  const { prepared, chat } = options;
  const total = prepared.chunks.length;
  const parts: ChunkSummary[] = [];
  for (const chunk of prepared.chunks) {
    options.onProgress({ stage: "reading", done: chunk.index, total });
    parts.push(await summariseChunk(chunk, total, options));
  }
  options.onProgress({ stage: "merging" });
  const merged = mergeChunkSummaries(parts.length ? parts : [EMPTY_CHUNK_SUMMARY], prepared.messages);
  const tldr = await writeTldr(merged, options.signal);

  const catchup = assembleCatchUp({
    id: crypto.randomUUID(),
    chat: { source: chat.source, formatLabel: chat.formatLabel, title: chat.title, messages: [], timeQuality: chat.timeQuality, warnings: [] },
    rangeMessages: prepared.messages,
    insights: prepared.insights,
    merged,
    tldr,
    warnings: [...chat.warnings, ...(prepared.rangeNote ? [prepared.rangeNote] : [])],
  });
  trackUsage("catchup_created");
  return catchup;
}

/** The cited messages plus a few around each, kept on the device for "Open in context". */
export function contextMessages(catchup: CatchUp, messages: Message[], around = 3): Message[] {
  const cited = new Set<string>([
    ...catchup.tldr.flatMap((t) => t.sourceIds),
    ...[catchup.decisions, catchup.deadlines, catchup.links, catchup.files, catchup.questions, catchup.polls].flat().flatMap((i) => i.sourceIds),
  ]);
  const keep = new Set<number>();
  messages.forEach((m, i) => {
    if (!cited.has(m.id)) return;
    for (let j = Math.max(0, i - around); j <= Math.min(messages.length - 1, i + around); j++) keep.add(j);
  });
  return [...keep].sort((a, b) => a - b).map((i) => messages[i]);
}
