"use client";

import { useEffect, useRef } from "react";
import { animateSpring } from "@/lib/ui/spring";
import { useInViewOnce } from "./use-in-view";

/**
 * Grows bar fills (scaleX) to their share on the "lift" spring, one after another, the first
 * time the list scrolls into view. Fills are found by the `data-fill` attribute (0..1).
 */
export function useSpringBars<T extends HTMLElement>(stagger = 90) {
  const ref = useRef<T>(null);
  const seen = useInViewOnce(ref, 0.4);

  useEffect(() => {
    const root = ref.current;
    if (!root || !seen) return;
    const stops: (() => void)[] = [];
    const timers: number[] = [];
    root.querySelectorAll<HTMLElement>("[data-fill]").forEach((fill, i) => {
      const target = Number(fill.dataset.fill);
      timers.push(
        window.setTimeout(() => {
          stops.push(animateSpring(0, target, "lift", (v) => (fill.style.transform = `scaleX(${Math.max(0, v)})`)));
        }, i * stagger),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      stops.forEach((stop) => stop());
    };
  }, [seen, stagger]);

  return ref;
}
