"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { ApiClientError } from "@/lib/client/api";
import { saveRun, toQuotes } from "@/lib/client/local-store";
import type { ChatOverview, PreparedChat } from "@/lib/client/prepare";
import { contextMessages, runCatchUp, type RunProgress } from "@/lib/client/run-catchup";

export type RunState =
  | { status: "idle" }
  | { status: "running"; progress: RunProgress | null; done: number; total: number }
  | { status: "done" }
  | { status: "error"; message: string };

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Sends the prepared parts, keeps the result in this browser, then opens it. Cancel aborts. */
export function useCatchUpRun() {
  const [state, setState] = useState<RunState>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => () => controller.current?.abort(), []);

  const start = useCallback(
    async (chat: ChatOverview, prepared: PreparedChat) => {
      if (controller.current) return;
      const abort = new AbortController();
      controller.current = abort;
      setState({ status: "running", progress: null, done: 0, total: prepared.chunks.length });
      try {
        const catchup = await runCatchUp({
          chat,
          prepared,
          signal: abort.signal,
          onProgress: (progress) =>
            setState((s) => ({
              status: "running",
              progress,
              done: progress.stage === "reading" ? progress.done : s.status === "running" ? s.done : 0,
              total: prepared.chunks.length,
            })),
        });
        const kept = saveRun({ catchup, quotes: toQuotes(contextMessages(catchup, prepared.messages)), pseudonyms: prepared.pseudonyms });
        if (!kept) {
          setState({ status: "error", message: "This browser blocked storage, so the catch-up can't be kept to open. Allow site storage (or leave private mode) and try again." });
          return;
        }
        setState({ status: "done" });
        const items = catchup.decisions.length + catchup.deadlines.length + catchup.links.length + catchup.files.length + catchup.questions.length + catchup.polls.length;
        toast(`Catch-up ready: ${items} ${items === 1 ? "thing" : "things"} from ${catchup.stats.messagesRead.toLocaleString("en-IN")} messages.`);
        router.push(`/catchup/${catchup.id}`);
      } catch (error) {
        if (isAbort(error)) {
          setState({ status: "idle" });
          toast("Cancelled. Nothing was kept.");
          return;
        }
        const message = error instanceof ApiClientError ? error.message : "Something went wrong while making the catch-up. Try again.";
        setState({ status: "error", message });
        toast(message, "error");
      } finally {
        if (controller.current === abort) controller.current = null;
      }
    },
    [router, toast],
  );

  const cancel = useCallback(() => controller.current?.abort(), []);
  const dismiss = useCallback(() => setState({ status: "idle" }), []);

  return { state, start, cancel, dismiss };
}
