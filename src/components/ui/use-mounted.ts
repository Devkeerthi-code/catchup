"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;

/** False during server render and hydration, true after. Gate reads of localStorage on it. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
