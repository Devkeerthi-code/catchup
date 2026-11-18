"use client";

import { useEffect, useRef } from "react";
import { ChatWorker } from "@/lib/client/chat-worker";

/**
 * One Web Worker per import screen. It holds the raw export, so it is terminated on unmount:
 * leaving the page drops the chat from memory.
 */
export function useChatWorker() {
  const ref = useRef<ChatWorker | null>(null);
  useEffect(() => {
    const worker = new ChatWorker();
    ref.current = worker;
    return () => {
      worker.dispose();
      if (ref.current === worker) ref.current = null;
    };
  }, []);

  return ref;
}
