"use client";

import { MaskedText } from "@/components/ui/masked-text";
import { itemsOf } from "@/lib/ui/items";
import type { CatchUp } from "@/lib/summary/types";
import { useCatchUpView } from "./catchup-context";
import { jumpToItem } from "./jump";

/** The item a TL;DR line is about: the first one that shares a source message with it. */
function itemFor(sourceIds: string[], catchup: CatchUp): string | null {
  const ids = new Set(sourceIds);
  return itemsOf(catchup).find((item) => item.sourceIds.some((id) => ids.has(id)))?.id ?? null;
}

export function TldrCard() {
  const { catchup, names } = useCatchUpView();
  if (!catchup.tldr.length) return null;
  return (
    <section className="tldr" aria-labelledby="tldr-title">
      <div className="tldr__head">
        <h2 id="tldr-title">TL;DR</h2>
        <span className="chip-meta">Read in 20 seconds</span>
      </div>
      <ol>
        {catchup.tldr.map((line, i) => {
          const target = itemFor(line.sourceIds, catchup);
          const text = <MaskedText text={line.text} names={names} />;
          return (
            <li key={i}>
              <span>
                {target ? (
                  <a
                    href={`#item-${target}`}
                    onClick={(e) => {
                      e.preventDefault();
                      jumpToItem(target);
                    }}
                  >
                    {text}
                  </a>
                ) : (
                  text
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
