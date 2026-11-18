"use client";

import { useEffect, useState, type RefObject } from "react";
import type { RangeSpec } from "@/lib/chat/range";
import type { ChatWorker } from "@/lib/client/chat-worker";
import type { PreparedChat } from "@/lib/client/prepare";

export type PrepareState =
  | { status: "idle" }
  | { status: "ready"; key: string; prepared: PreparedChat; durationMs: number }
  | { status: "error"; key: string; message: string };

const DEBOUNCE_MS = 220;

/**
 * Re-runs range + masking + chunking in the worker whenever the chat or range changes, so the
 * privacy preview and the "N parts" count are always for exactly what would be sent.
 */
export function usePrepared(worker: RefObject<ChatWorker | null>, version: number | null, chatIndex: number, spec: RangeSpec | null) {
  const [state, setState] = useState<PrepareState>({ status: "idle" });
  const key = version === null || !spec ? null : JSON.stringify([version, chatIndex, spec]);

  useEffect(() => {
    if (key === null) return;
    // Read the inputs back from the key so the effect depends on one stable string.
    const [, index, range] = JSON.parse(key) as [number, number, RangeSpec];
    let live = true;
    const timer = window.setTimeout(async () => {
      try {
        if (!worker.current) throw new Error("The reader stopped. Reload the page and try again.");
        const { prepared, durationMs } = await worker.current.prepare(index, range);
        if (live) setState({ status: "ready", key, prepared, durationMs });
      } catch (error) {
        if (live) setState({ status: "error", key, message: error instanceof Error ? error.message : "Couldn't prepare this range." });
      }
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [key, worker]);

  const current = key !== null && state.status !== "idle" && state.key === key ? state : null;
  return { current, pending: key !== null && current === null };
}
