"use client";

import { useEffect, useRef } from "react";
import { formatCount } from "@/lib/ui/format";
import { animateSpring, type SpringName } from "@/lib/ui/spring";

interface SpringNumberProps {
  value: number;
  /** Where the count starts. Defaults to 0. */
  from?: number;
  /** Start only when this becomes true (e.g. scrolled into view). */
  play?: boolean;
  spring?: SpringName;
  className?: string;
}

/**
 * A counter that springs to its value. The text is written directly to the DOM each frame,
 * so React doesn't re-render 60 times a second; screen readers get the final value.
 */
export function SpringNumber({ value, from = 0, play = true, spring = "count", className }: SpringNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(from);

  useEffect(() => {
    const el = ref.current;
    if (!el || !play) return;
    return animateSpring(shown.current, value, spring, (v) => {
      shown.current = v;
      el.textContent = formatCount(v);
    });
  }, [value, play, spring]);

  return (
    <span className={className}>
      <span ref={ref} aria-hidden="true" className="num">
        {formatCount(from)}
      </span>
      <span className="visually-hidden">{formatCount(value)}</span>
    </span>
  );
}
