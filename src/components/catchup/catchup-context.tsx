"use client";

import { createContext, useContext } from "react";
import type { NameMap } from "@/lib/ui/names";
import type { CatchUp, QuoteMessage } from "@/lib/summary/types";

export interface CatchUpViewState {
  catchup: CatchUp;
  /** Pseudonymised source messages kept in this browser; null when this device doesn't have them. */
  quotes: QuoteMessage[] | null;
  quoteById: ReadonlyMap<string, QuoteMessage>;
  /** Set only while "Show real names" is on. */
  names: NameMap | null;
  now: number;
  /** The fictional demo run: nothing is counted or saved. */
  demo: boolean;
}

const CatchUpContext = createContext<CatchUpViewState | null>(null);

export const CatchUpProvider = CatchUpContext.Provider;

export function useCatchUpView(): CatchUpViewState {
  const value = useContext(CatchUpContext);
  if (!value) throw new Error("useCatchUpView must be used inside CatchUpProvider");
  return value;
}
