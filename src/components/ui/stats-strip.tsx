"use client";

import { useRef } from "react";
import { SpringNumber } from "@/components/motion/spring-number";
import { useInViewOnce } from "@/components/motion/use-in-view";
import type { CatchUpStats } from "@/lib/summary/types";

interface StatsStripProps {
  stats: CatchUpStats;
  badge: string;
  title: string;
}

/** The inverse band of big numbers. Minutes saved is an estimate and says how it's worked out. */
export function StatsStrip({ stats, badge, title }: StatsStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInViewOnce(ref);
  return (
    <div className="stats" ref={ref}>
      <div className="stats__head">
        <h2 className="visually-hidden">{title}</h2>
        <span className="demo-badge">{badge}</span>
        <p>Minutes saved assumes about 2.5 s to scroll past each message, minus about 10 s to read each catch-up item.</p>
      </div>
      <dl className="stats__grid">
        <div>
          <dt>messages read</dt>
          <dd>
            <SpringNumber value={stats.messagesRead} play={seen} />
          </dd>
        </div>
        <div>
          <dt>stickers, &ldquo;ok&rdquo;s, system lines and media notes set aside</dt>
          <dd>
            <SpringNumber className="mark" value={stats.noiseRemoved} play={seen} />
          </dd>
        </div>
        <div>
          <dt>of scrolling you skipped (estimate)</dt>
          <dd>
            <SpringNumber value={stats.minutesSaved} play={seen} />
            <small>min</small>
          </dd>
        </div>
      </dl>
    </div>
  );
}
