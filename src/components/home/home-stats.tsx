"use client";

import { useMemo } from "react";
import { StatsStrip } from "@/components/ui/stats-strip";
import { useMounted } from "@/components/ui/use-mounted";
import { recentRuns } from "@/lib/client/local-store";
import { DEMO_STATS } from "@/lib/demo/hero-chat";

/** Real numbers from this browser's last catch-up when there is one; otherwise labelled demo numbers. */
export function HomeStats() {
  const mounted = useMounted();
  const last = useMemo(() => (mounted ? (recentRuns()[0] ?? null) : null), [mounted]);
  return last ? (
    <StatsStrip key="real" stats={last.stats} badge={`From your last catch-up · ${last.title}`} title="Numbers from your last catch-up" />
  ) : (
    <StatsStrip key="demo" stats={DEMO_STATS} badge="Demo · fictional chat" title="Numbers from a demo run" />
  );
}
