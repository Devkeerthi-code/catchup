"use client";

import { useEffect } from "react";
import { Spring, SPRINGS } from "@/lib/ui/spring";

const PRESSABLE = ".btn, .icon-btn, .tab, .tl-item a, [data-press]";

/**
 * Every button sinks 3.5% on press and springs back with a little overshoot. One delegated
 * listener covers the whole app, so components don't each need wiring.
 */
export function PressSprings() {
  useEffect(() => {
    const springs = new WeakMap<HTMLElement, Spring>();

    const springFor = (el: HTMLElement) => {
      let spring = springs.get(el);
      if (!spring) {
        spring = new Spring(1, "snappy", (v) => {
          el.style.transform = v === 1 ? "" : `scale(${v})`;
        });
        springs.set(el, spring);
      }
      return spring;
    };

    let pressed: HTMLElement | null = null;

    const release = () => {
      if (!pressed) return;
      const spring = springFor(pressed);
      spring.config = SPRINGS.lift;
      spring.to(1);
      pressed = null;
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = (event.target as Element | null)?.closest<HTMLElement>(PRESSABLE);
      if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
      pressed = target;
      const spring = springFor(target);
      spring.config = SPRINGS.snappy;
      spring.to(0.965);
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", release);
    window.addEventListener("blur", release);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, []);
  return null;
}
