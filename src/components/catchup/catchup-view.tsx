"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { StatsStrip } from "@/components/ui/stats-strip";
import { useToast } from "@/components/ui/toast";
import { pseudonymLookup, revealNames } from "@/lib/ui/names";
import type { CatchUp, QuoteMessage } from "@/lib/summary/types";
import { CatchUpProvider, type CatchUpViewState } from "./catchup-context";
import { CatchUpHeader, NewCatchUpLink } from "./catchup-header";
import { copyText } from "./copy";
import { DayTimeline } from "./day-timeline";
import { InsightsPanel } from "./insights-panel";
import { ItemSections } from "./item-sections";
import { SectionNav } from "./section-nav";
import { TldrCard } from "./tldr-card";

interface CatchUpViewProps {
  catchup: CatchUp;
  quotes: QuoteMessage[] | null;
  pseudonyms: [string, string][] | null;
  demo?: boolean;
  badge?: string;
  /** Extra header actions (e.g. delete on a saved catch-up). */
  actions?: ReactNode;
  /** Bottom of the side column (e.g. the save panel). */
  aside?: ReactNode;
}

function NamesSwitch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="switch names-switch">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch__track" aria-hidden="true" />
      Show real names <span className="chip-meta">(this device only)</span>
    </label>
  );
}

function CopyTldr({ catchup, reveal }: { catchup: CatchUp; reveal: (t: string) => string }) {
  const toast = useToast();
  if (!catchup.tldr.length) return null;
  const copy = async () => {
    const text = [`${catchup.title}: catch-up`, ...catchup.tldr.map((l, i) => `${i + 1}. ${reveal(l.text)}`)].join("\n");
    const ok = await copyText(text);
    toast(ok ? "TL;DR copied. Paste it anywhere." : "Couldn't copy. Select the text and copy it instead.", ok ? "success" : "error");
  };
  return (
    <button className="btn btn--secondary btn--sm" type="button" onClick={copy}>
      <Icon id="g-clipboard" />
      Copy TL;DR
    </button>
  );
}

/** The whole result screen, shared by fresh, saved and demo catch-ups. */
export function CatchUpView({ catchup, quotes, pseudonyms, demo = false, badge, actions, aside }: CatchUpViewProps) {
  const [showNames, setShowNames] = useState(false);
  const [now] = useState(() => Date.now());
  const lookup = useMemo(() => pseudonymLookup(pseudonyms), [pseudonyms]);
  const quoteById = useMemo(() => new Map((quotes ?? []).map((q) => [q.id, q])), [quotes]);
  const names = showNames ? lookup : null;
  const state: CatchUpViewState = useMemo(
    () => ({ catchup, quotes, quoteById, names, now, demo }),
    [catchup, quotes, quoteById, names, now, demo],
  );

  return (
    <CatchUpProvider value={state}>
      <main id="main">
        <div className="shell">
          <CatchUpHeader
            badge={badge}
            actions={
              <>
                <CopyTldr catchup={catchup} reveal={(t) => revealNames(t, names)} />
                <NewCatchUpLink />
                {actions}
                {lookup.size ? <NamesSwitch on={showNames} onChange={setShowNames} /> : null}
              </>
            }
          />
          {catchup.warnings.length ? (
            <ul className="cu-warnings" aria-label="Notes about this chat">
              {catchup.warnings.map((w) => (
                <li key={w} className="notice">
                  <Icon id="u-alert" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <TldrCard />
          <DayTimeline />
        </div>
        <SectionNav />
        <div className="shell cu-body">
          <ItemSections />
          <aside className="cu-aside" aria-labelledby="ins-title">
            <InsightsPanel />
            {aside}
          </aside>
        </div>
        <section className="shell cu-stats" aria-label="Numbers from this catch-up">
          <StatsStrip stats={catchup.stats} badge={demo ? "From the demo catch-up · fictional chat" : "From this catch-up"} title="Numbers from this catch-up" />
        </section>
      </main>
    </CatchUpProvider>
  );
}
