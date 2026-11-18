"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { DemoBadge } from "@/components/ui/demo-badge";
import { Icon } from "@/components/ui/icon";
import { DEMO_GROUP, DEMO_LINES, DEMO_SIGNAL, DEMO_SPAN, DEMO_TOTAL } from "@/lib/demo/hero-chat";
import { formatCount } from "@/lib/ui/format";
import { ITEM_META } from "@/lib/ui/items";
import { animateSpring, prefersReducedMotion } from "@/lib/ui/spring";

const LIGHT_AT = 700;
const LIGHT_STAGGER = 140;
const NOISE_STAGGER = 55;

/**
 * The product in one motion: signal lines get the highlighter one by one, then the noise
 * collapses on a spring while the counter falls from 1,284 to 9. All DOM writes, no re-renders.
 */
function useCollapse() {
  const box = useRef<HTMLElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const running = useRef<(() => void)[]>([]);

  const stopAll = () => {
    running.current.forEach((stop) => stop());
    running.current = [];
  };

  const play = useCallback(() => {
    const root = box.current;
    const counter = num.current;
    if (!root || !counter) return;
    stopAll();
    const signals = [...root.querySelectorAll<HTMLElement>(".msg--signal")];
    const noise = [...root.querySelectorAll<HTMLElement>(".msg--noise")];
    noise.forEach((li) => {
      li.style.height = "";
      li.style.opacity = "";
      li.removeAttribute("aria-hidden");
    });
    signals.forEach((li) => li.classList.remove("is-lit"));
    root.dataset.phase = "noise";
    counter.textContent = formatCount(DEMO_TOTAL);

    if (prefersReducedMotion()) {
      noise.forEach((li) => {
        li.style.height = "0px";
        li.style.opacity = "0";
        li.setAttribute("aria-hidden", "true");
      });
      signals.forEach((li) => li.classList.add("is-lit"));
      counter.textContent = String(DEMO_SIGNAL);
      root.dataset.phase = "signal";
      return;
    }

    const later = (ms: number, fn: () => void) => {
      const t = window.setTimeout(fn, ms);
      running.current.push(() => clearTimeout(t));
    };
    signals.forEach((li, i) => later(LIGHT_AT + i * LIGHT_STAGGER, () => li.classList.add("is-lit")));
    later(LIGHT_AT + signals.length * LIGHT_STAGGER + 300, () => {
      running.current.push(
        animateSpring(DEMO_TOTAL, DEMO_SIGNAL, "count", (v) => {
          counter.textContent = formatCount(v);
          if (v < 60) root.dataset.phase = "signal";
        }),
      );
      noise.forEach((li, i) =>
        later(i * NOISE_STAGGER, () => {
          const h = li.getBoundingClientRect().height;
          li.setAttribute("aria-hidden", "true");
          running.current.push(
            animateSpring(h, 0, "gentle", (v) => {
              li.style.height = `${Math.max(0, v)}px`;
              li.style.opacity = String(Math.max(0, v / h));
            }),
          );
        }),
      );
    });
  }, []);

  useEffect(() => {
    play();
    return stopAll;
  }, [play]);

  return { box, num, play };
}

export function HeroCollapse() {
  const { box, num, play } = useCollapse();
  return (
    <figure className="chat-collapse" ref={box} data-phase="noise" aria-labelledby="collapse-cap">
      <div className="chat-collapse__bar">
        <div className="chat-collapse__title">
          <span className="avatar-stack" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>{DEMO_GROUP}</span>
        </div>
        <DemoBadge>Demo chat</DemoBadge>
      </div>
      <div className="chat-collapse__counter">
        <span className="chat-collapse__num num" ref={num} aria-hidden="true">
          {formatCount(DEMO_TOTAL)}
        </span>
        <span className="chat-collapse__unit-wrap" aria-hidden="true">
          <span className="chat-collapse__unit unit-noise">messages since you left</span>
          <span className="chat-collapse__unit unit-signal">things that matter</span>
        </span>
        <span className="visually-hidden">
          {formatCount(DEMO_TOTAL)} messages since you left, {DEMO_SIGNAL} things that matter.
        </span>
        <span className="chat-collapse__sub">{DEMO_SPAN}</span>
      </div>
      <ol className="stream" aria-label="Demo chat messages">
        {DEMO_LINES.map((line, i) => (
          <li key={i} className={`msg ${line.type ? "msg--signal" : "msg--noise"}`}>
            <div className="msg__inner">
              <span className="msg__who">{line.who}</span>
              <span className="msg__text">{line.text}</span>
              {line.type ? (
                <span className="msg__type tag">
                  <Icon id={ITEM_META[line.type].icon} />
                  <span className="msg__type-label">{ITEM_META[line.type].label}</span>
                </span>
              ) : (
                <span />
              )}
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="chat-collapse__foot" id="collapse-cap">
        <span>{DEMO_SIGNAL} items, each linked to its message</span>
        <span className="flex items-center gap-2">
          <button className="btn btn--ghost btn--sm" type="button" onClick={play}>
            <Icon id="u-replay" />
            Replay
          </button>
          <Link href="/demo">Open the demo catch-up</Link>
        </span>
      </figcaption>
    </figure>
  );
}
