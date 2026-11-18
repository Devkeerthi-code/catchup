"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ITEM_META, SECTIONS } from "@/lib/ui/items";
import { useCatchUpView } from "./catchup-context";

/** Sticky chips with scroll-spy: the section in the middle band of the screen is marked current. */
export function SectionNav() {
  const { catchup } = useCatchUpView();
  const present = SECTIONS.filter((s) => catchup[s.key].length);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) setCurrent(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    document.querySelectorAll(".cu-section").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [catchup.id]);

  if (present.length < 2) return null;
  return (
    <nav className="secnav" aria-label="Catch-up sections">
      <div className="shell">
        <ul>
          {present.map((s) => (
            <li key={s.id}>
              <a href={`#sec-${s.id}`} aria-current={current === `sec-${s.id}` ? "true" : undefined}>
                <Icon id={ITEM_META[s.type].icon} />
                {s.title}
                <b>{catchup[s.key].length}</b>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
