"use client";

import { useEffect, useRef, useState } from "react";
import { DEMO_MASK_ROWS } from "@/lib/demo/hero-chat";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

type Token = { readonly from: string; readonly to: string };

const STEP_MS = 220;
// Steps 1..N mask tokens one by one, the masked text holds ~2.6 s, then they unmask in order.
const holdUntil = (n: number) => n + 12;
const cycleLength = (n: number) => holdUntil(n) + n + 8;

function Tok({ token, masked }: { token: Token; masked: boolean }) {
  return <span className={`tok${masked ? " is-masked" : ""}`}>{masked ? token.to : token.from}</span>;
}

/**
 * Tokens flip between a fictional original and what is actually sent, one after another,
 * only while the panel is on screen. Reduced motion shows the masked version, still.
 */
export function MaskDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const reduced = usePrefersReducedMotion();
  const tokenCount = DEMO_MASK_ROWS.reduce((n, row) => n + 1 + row.parts.filter((p) => typeof p !== "string").length, 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let timer = 0;
    let visible = false;
    const tick = () => {
      setStep((s) => (s + 1) % cycleLength(tokenCount));
      timer = window.setTimeout(tick, STEP_MS);
    };
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      clearTimeout(timer);
      if (visible) timer = window.setTimeout(tick, 600);
    }, { threshold: 0.35 });
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [tokenCount, reduced]);

  const masked = (index: number) => {
    if (reduced) return true;
    const hold = holdUntil(tokenCount);
    return step > index && (step <= hold || step - hold <= index);
  };

  let index = 0;
  return (
    <div className="bento__ui mask-demo" ref={ref}>
      {DEMO_MASK_ROWS.map((row) => {
        const whoIndex = index++;
        return (
          <div className="mask-row" key={row.time}>
            <span className="mask-row__who">
              <Tok token={row.who} masked={masked(whoIndex)} /> · {row.time}
            </span>
            <span>
              {row.parts.map((part, i) => {
                if (typeof part === "string") return <span key={i}>{part}</span>;
                const tokenIndex = index++;
                return <Tok key={i} token={part} masked={masked(tokenIndex)} />;
              })}
            </span>
          </div>
        );
      })}
      <p className="mask-legend">
        <span>
          <b>Names</b> become Member N
        </span>
        <span>
          <b>Phones, emails, UPI IDs</b> are replaced
        </span>
        <span>
          <b>Links</b> are kept
        </span>
      </p>
    </div>
  );
}
