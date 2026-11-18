"use client";

import { useMemo, useState } from "react";
import { useMounted } from "@/components/ui/use-mounted";
import { buildDemoRun } from "@/lib/demo/demo-run";
import { CatchUpSkeleton } from "./catchup-skeleton";
import { CatchUpView } from "./catchup-view";

/** The fictional demo, built in the browser so its dates follow the device's clock and time zone. */
export function DemoCatchUp() {
  const mounted = useMounted();
  const [now] = useState(() => Date.now());
  const run = useMemo(() => (mounted ? buildDemoRun(now) : null), [mounted, now]);
  if (!run) return <CatchUpSkeleton label="Loading the demo catch-up" />;
  return <CatchUpView catchup={run.catchup} quotes={run.quotes} pseudonyms={run.pseudonyms} demo badge="Demo catch-up · fictional group and members" />;
}
