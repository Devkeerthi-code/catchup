"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { SpringNumber } from "@/components/motion/spring-number";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { formatCount, formatSpan, plural } from "@/lib/ui/format";
import { ITEM_META, SECTIONS, SOURCE_META } from "@/lib/ui/items";
import { useCatchUpView } from "./catchup-context";

interface CatchUpHeaderProps {
  badge?: string;
  actions: ReactNode;
}

function ScoreCard() {
  const { catchup } = useCatchUpView();
  const total = SECTIONS.reduce((n, s) => n + catchup[s.key].length, 0);
  return (
    <div className="cu-score">
      <div className="cu-score__big">
        <b>
          <SpringNumber value={total} from={catchup.stats.messagesRead} />
        </b>
        <span>
          {total === 1 ? "thing that matters" : "things that matter"}, from <s>{plural(catchup.stats.messagesRead, "message")}</s>
        </span>
      </div>
      <ul className="typecounts" aria-label="Items by type">
        {SECTIONS.filter((s) => catchup[s.key].length).map((s) => (
          <li key={s.id} className="tag">
            <Icon id={ITEM_META[s.type].icon} />
            {s.short}
            <b>{catchup[s.key].length}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CatchUpHeader({ badge, actions }: CatchUpHeaderProps) {
  const { catchup } = useCatchUpView();
  const source = SOURCE_META[catchup.source];
  const members = catchup.insights.members.length;
  return (
    <section className="cu-head" aria-labelledby="cu-title">
      <div>
        {badge ? <DemoBadge>{badge}</DemoBadge> : <span className="eyebrow">Your catch-up</span>}
        <h1 id="cu-title" className="break-anywhere">
          {catchup.title}
        </h1>
        <div className="cu-meta">
          <span>
            <Icon id="u-clock" />
            {formatSpan(catchup.range.from, catchup.range.to)}
          </span>
          <span>
            <Icon id={source.icon} />
            {source.label}
          </span>
          {members ? (
            <span>
              <Icon id="u-mask" />
              People shown as Member 1, Member 2…
            </span>
          ) : null}
          <span>
            <Icon id="u-check" />
            {formatCount(catchup.stats.noiseRemoved)} noise messages set aside
          </span>
        </div>
        <div className="cu-actions">{actions}</div>
      </div>
      <ScoreCard />
    </section>
  );
}

export function NewCatchUpLink() {
  return (
    <Link className="btn btn--ghost btn--sm" href="/import">
      <Icon id="u-upload" />
      New catch-up
    </Link>
  );
}
