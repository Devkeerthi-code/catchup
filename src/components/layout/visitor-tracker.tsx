"use client";

import { useEffect } from "react";
import { trackVisitorOnce } from "@/lib/client/api";

/** Counts this browser once (no id, no cookie), for an honest "used by N people". */
export function VisitorTracker() {
  useEffect(() => trackVisitorOnce(), []);
  return null;
}
