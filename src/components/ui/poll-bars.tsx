"use client";

import { useSpringBars } from "@/components/motion/spring-bars";
import { formatCount } from "@/lib/ui/format";

interface PollOptionView {
  text: string;
  votes: number;
}

/** Vote bars; the winner is ink and labelled "most votes" in text, not only by colour. */
export function PollBars({ options, render = (t) => t }: { options: PollOptionView[]; render?: (text: string) => string }) {
  const ref = useSpringBars<HTMLUListElement>();
  const total = options.reduce((sum, o) => sum + o.votes, 0) || 1;
  const top = Math.max(...options.map((o) => o.votes));
  return (
    <ul className="poll" ref={ref}>
      {options.map((option) => (
        <li key={option.text} className={option.votes === top && top > 0 ? "is-winner" : undefined}>
          <span className="poll__label">
            <span>{render(option.text)}</span>
            <b>{formatCount(option.votes)}</b>
          </span>
          <span className="poll__track" aria-hidden="true">
            <span className="poll__fill" data-fill={(option.votes / total).toFixed(3)} />
          </span>
        </li>
      ))}
    </ul>
  );
}
