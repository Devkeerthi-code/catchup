"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/icon";
import { deadlineUrgency } from "@/lib/ui/deadline";
import { formatDateKey, formatTime } from "@/lib/ui/format";
import { ITEM_META, itemTitle, itemsOf } from "@/lib/ui/items";
import { revealNames } from "@/lib/ui/names";
import { animateSpring, prefersReducedMotion } from "@/lib/ui/spring";
import { BANDS, bandFor, bandHours, bandPosition, groupByStripDay, type Band } from "@/lib/ui/timeline";
import type { CatchUpItem } from "@/lib/summary/types";
import { useCatchUpView } from "./catchup-context";
import { jumpToItem } from "./jump";

const MAX_PER_BAND = 3;

/** Every band gets the height of the busiest one, so the four tracks line up. */
function rowsFor(items: CatchUpItem[]): number {
  return Math.max(1, ...BANDS.map((b) => Math.min(MAX_PER_BAND, items.filter((it) => bandFor(it.at).id === b.id).length)));
}

function Density({ hours, band, max }: { hours: number[]; band: Band; max: number }) {
  const bars = bandHours(hours, band).flatMap((count, i) =>
    [0, 1, 2, 3].map((q) => {
      // A small deterministic wobble so quarter-hour bars read as chat volume, not a bar chart.
      const wobble = 0.65 + 0.35 * Math.abs(Math.sin(((band.from + i) * 4 + q) * 1.7));
      return Math.max(6, (count / max) * 100 * wobble);
    }),
  );
  return (
    <div className="band__density" aria-hidden="true">
      {bars.map((h, i) => (
        <i key={i} style={{ height: `${h.toFixed(0)}%` }} />
      ))}
    </div>
  );
}

function TimelineChip({ item, band, row }: { item: CatchUpItem; band: Band; row: number }) {
  const { names, now } = useCatchUpView();
  const meta = ITEM_META[item.type];
  const urgent = item.type === "deadline" && deadlineUrgency(item, now).kind === "urgent";
  return (
    <li
      className={`tl-item${urgent ? " is-urgent" : ""}`}
      style={{ "--x": bandPosition(item.at, band).toFixed(1), "--row": row } as CSSProperties}
      data-tl
    >
      <a
        href={`#item-${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          jumpToItem(item.id);
        }}
      >
        <Icon id={meta.icon} />
        <span className="visually-hidden">{meta.label}: </span>
        <span className="tl-item__t">{revealNames(itemTitle(item), names)}</span>
        <time>{formatTime(item.at)}</time>
      </a>
    </li>
  );
}

/** Items slide into their time slots in the order they happened, on the "settle" spring. */
function useSlideIn(dayKey: string) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const stops: (() => void)[] = [];
    const timers: number[] = [];
    root.querySelectorAll<HTMLElement>("[data-tl]").forEach((el, i) => {
      el.style.opacity = "0";
      el.style.translate = "-28px 0";
      timers.push(
        window.setTimeout(() => {
          stops.push(
            animateSpring(0, 1, "settle", (v) => {
              el.style.opacity = String(Math.min(1, v * 1.4));
              el.style.translate = `${(1 - v) * -28}px 0`;
            }),
          );
        }, 200 + i * 90),
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      stops.forEach((stop) => stop());
      root.querySelectorAll<HTMLElement>("[data-tl]").forEach((el) => {
        el.style.opacity = "";
        el.style.translate = "";
      });
    };
  }, [dayKey]);
  return ref;
}

export function DayTimeline() {
  const { catchup } = useCatchUpView();
  const days = useMemo(() => groupByStripDay(itemsOf(catchup)), [catchup]);
  const [picked, setPicked] = useState<string | null>(null);
  const day = days.find((d) => d.date === picked) ?? days[days.length - 1];
  const ref = useSlideIn(day?.date ?? "");
  if (!day) return null;

  const max = Math.max(1, ...catchup.insights.hours);
  const estimated = catchup.insights.timeQuality === "estimated";

  return (
    <section className="tl" aria-labelledby="tl-title">
      <div className="tl__head">
        <h2 id="tl-title">While you were away</h2>
        <span className="tl__now">
          {formatDateKey(day.date)} · grey bars are message volume by hour, cards are what mattered
          {estimated ? ". Times are estimates: this chat had no timestamps" : ""}
        </span>
      </div>
      {days.length > 1 ? (
        <div className="tl__days" role="group" aria-label="Choose a day">
          {days.map((d) => (
            <button
              key={d.date}
              type="button"
              className="tl__day"
              aria-pressed={d.date === day.date}
              onClick={() => setPicked(d.date)}
            >
              {formatDateKey(d.date)}
              <b>{d.items.length}</b>
            </button>
          ))}
        </div>
      ) : null}
      <div className="tl__bands" ref={ref} style={{ "--rows": rowsFor(day.items) } as CSSProperties}>
        {BANDS.map((band) => {
          const items = day.items.filter((it) => bandFor(it.at).id === band.id);
          const shown = items.slice(0, MAX_PER_BAND);
          return (
            <div className="band" key={band.id}>
              <div className="band__label">
                {band.label}
                <small>{band.range}</small>
              </div>
              <div className="band__track">
                <Density hours={catchup.insights.hours} band={band} max={max} />
                <ul className="band__items" aria-label={band.label}>
                  {shown.length ? (
                    shown.map((item, row) => <TimelineChip key={item.id} item={item} band={band} row={row} />)
                  ) : (
                    <li className="chip-meta band__none">Nothing important</li>
                  )}
                </ul>
                {items.length > shown.length ? <p className="band__more">+{items.length - shown.length} more below</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
