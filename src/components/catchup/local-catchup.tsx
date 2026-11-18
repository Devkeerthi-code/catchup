"use client";

import { useMemo } from "react";
import { useMounted } from "@/components/ui/use-mounted";
import { loadRun } from "@/lib/client/local-store";
import { CatchUpMissing } from "./catchup-missing";
import { CatchUpSkeleton } from "./catchup-skeleton";
import { CatchUpView } from "./catchup-view";
import { SavePanel } from "./save-panel";

/** A catch-up made in this browser, read from localStorage (it never left the device). */
export function LocalCatchUp({ id }: { id: string }) {
  const mounted = useMounted();
  const run = useMemo(() => (mounted ? loadRun(id) : undefined), [mounted, id]);

  if (run === undefined) return <CatchUpSkeleton />;
  if (run === null) {
    return (
      <CatchUpMissing
        title="This catch-up isn't in this browser"
        body="Catch-ups are kept in the browser that made them, and only the last 8 are kept. If you saved it to your account, open it from Saved."
      />
    );
  }
  return <CatchUpView catchup={run.catchup} quotes={run.quotes} pseudonyms={run.pseudonyms} aside={<SavePanel catchup={run.catchup} />} />;
}
