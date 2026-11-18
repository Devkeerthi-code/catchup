"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch, trackUsage } from "@/lib/client/api";
import type { ChatOverview } from "@/lib/client/prepare";
import type { Transcript } from "@/lib/chat/adapters/screenshot";
import { chatsByActivity, defaultRange, type RangeChoice } from "@/lib/ui/range-choice";
import { useChatWorker } from "./use-chat-worker";

export type Origin = "file" | "paste" | "shot";

export interface Loaded {
  origin: Origin;
  /** What was read, e.g. "WhatsApp Chat with CSE-B.zip · 412 KB" or "Pasted text". */
  label: string;
  chats: ChatOverview[];
  parseMs: number;
  /** Incremented on every successful read, so stale prepare results can be told apart. */
  version: number;
}

export type ParseState =
  | { status: "empty" }
  | { status: "reading"; origin: Origin; label: string }
  | { status: "error"; origin: Origin; message: string; label: string | null }
  | ({ status: "loaded" } & Loaded);

const READ_FAILED = "Something went wrong while reading. Try again.";

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : READ_FAILED;
}

function withRetryHint(error: unknown): unknown {
  if (error instanceof ApiClientError && error.status === 429 && error.retryAfterSeconds > 0) {
    return new Error(`${error.message} Try again in ${error.retryAfterSeconds} s.`);
  }
  return error;
}

/** Reading an export (file, pasted text or screenshots) into chat overviews, in the worker. */
export function useImport() {
  const worker = useChatWorker();
  const [state, setState] = useState<ParseState>({ status: "empty" });
  const [chatIndex, setChatIndex] = useState(0);
  const [range, setRange] = useState<RangeChoice | null>(null);
  const seq = useRef(0);
  const version = useRef(0);
  const toast = useToast();

  const finish = useCallback((origin: Origin, label: string, chats: ChatOverview[], parseMs: number, ticket: number) => {
    if (ticket !== seq.current) return;
    const sorted = chatsByActivity(chats);
    version.current += 1;
    setChatIndex(sorted[0].index);
    setRange(defaultRange(sorted[0]));
    setState({ status: "loaded", origin, label, chats: sorted, parseMs, version: version.current });
    if (origin !== "shot") trackUsage(`import_${sorted[0].source}` as const);
  }, []);

  const fail = useCallback((origin: Origin, label: string | null, error: unknown, ticket: number) => {
    if (ticket !== seq.current) return;
    if (error instanceof DOMException && error.name === "AbortError") return;
    const message = errorMessage(error);
    setState({ status: "error", origin, message, label });
    // While typing a paste the inline message is enough; a toast per keystroke pause would nag.
    if (origin !== "paste") toast(message, "error");
  }, [toast]);

  const readFiles = useCallback(
    async (files: File[], label: string) => {
      const ticket = ++seq.current;
      setState({ status: "reading", origin: "file", label });
      try {
        if (!worker.current) throw new Error("The file reader isn't ready yet. Try again in a second.");
        const { chats, durationMs } = await worker.current.parseFiles(files);
        finish("file", label, chats, durationMs, ticket);
      } catch (error) {
        fail("file", label, error, ticket);
      }
    },
    [worker, finish, fail],
  );

  const readText = useCallback(
    async (text: string) => {
      const ticket = ++seq.current;
      setState({ status: "reading", origin: "paste", label: "Pasted text" });
      try {
        if (!worker.current) throw new Error("The reader isn't ready yet. Try again in a second.");
        const { chats, durationMs } = await worker.current.parseText(text);
        finish("paste", "Pasted text", chats, durationMs, ticket);
      } catch (error) {
        fail("paste", "Pasted text", error, ticket);
      }
    },
    [worker, finish, fail],
  );

  /** The one step that sends raw content (the images) off the device; the UI asks first. */
  const readScreenshots = useCallback(
    async (images: File[]) => {
      const ticket = ++seq.current;
      const label = `${images.length} screenshot${images.length === 1 ? "" : "s"}`;
      setState({ status: "reading", origin: "shot", label });
      try {
        const form = new FormData();
        images.forEach((image) => form.append("images", image, image.name));
        const { transcript } = await apiFetch<{ transcript: Transcript }>("/api/screenshot", { method: "POST", body: form });
        if (!worker.current) throw new Error("The reader isn't ready yet. Try again in a second.");
        const { chats, durationMs } = await worker.current.parseTranscript(transcript);
        finish("shot", label, chats, durationMs, ticket);
      } catch (error) {
        fail("shot", label, withRetryHint(error), ticket);
      }
    },
    [worker, finish, fail],
  );

  const reset = useCallback(() => {
    seq.current += 1;
    setState({ status: "empty" });
    setRange(null);
  }, []);

  const pickChat = useCallback(
    (index: number) => {
      if (state.status !== "loaded") return;
      const chat = state.chats.find((c) => c.index === index);
      if (!chat) return;
      setChatIndex(index);
      setRange(defaultRange(chat));
    },
    [state],
  );

  const chat = state.status === "loaded" ? (state.chats.find((c) => c.index === chatIndex) ?? state.chats[0]) : null;
  return { worker, state, chat, range, setRange, readFiles, readText, readScreenshots, reset, pickChat };
}
