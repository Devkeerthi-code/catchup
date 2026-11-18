"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { ITEM_META, SECTIONS } from "@/lib/ui/items";
import type { CatchUpItem } from "@/lib/summary/types";
import { saveCalendar } from "./calendar";
import { useCatchUpView } from "./catchup-context";
import { DeadlineCard, DecisionCard, FileCard, LinkCard, PollCard, QuestionCard } from "./item-cards";

function Card({ item }: { item: CatchUpItem }) {
  switch (item.type) {
    case "deadline":
      return <DeadlineCard item={item} />;
    case "decision":
      return <DecisionCard item={item} />;
    case "question":
      return <QuestionCard item={item} />;
    case "poll":
      return <PollCard item={item} />;
    case "link":
      return <LinkCard item={item} />;
    case "file":
      return <FileCard item={item} />;
  }
}

function CalendarAll() {
  const { catchup, demo } = useCatchUpView();
  const toast = useToast();
  const dated = catchup.deadlines.filter((d) => d.date);
  if (dated.length < 2) return null;
  return (
    <button
      className="btn btn--ghost btn--sm ml-auto"
      type="button"
      onClick={() => {
        const n = saveCalendar(catchup.deadlines, catchup.title, demo);
        toast(`Calendar file saved with ${n} events.`);
      }}
    >
      <Icon id="u-download" />
      All dated ({dated.length}) as .ics
    </button>
  );
}

export function NothingFound() {
  return (
    <div className="cu-empty">
      <div className="noise" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <h2>Nothing in this stretch needed you</h2>
      <p>
        No deadlines, decisions, links, files, polls or open questions turned up in these messages. That happens with short or very
        chatty ranges. Try a longer range if you expected something.
      </p>
      <Link className="btn btn--secondary" href="/import">
        <Icon id="u-upload" />
        Pick a different range
      </Link>
    </div>
  );
}

export function ItemSections() {
  const { catchup, quotes } = useCatchUpView();
  const present = SECTIONS.filter((s) => catchup[s.key].length);
  if (!present.length) return <NothingFound />;
  return (
    <div>
      {quotes === null ? (
        <p className="notice mb-6">
          <Icon id="u-device" />
          <span>
            Source messages stay on the device that made this catch-up, so the quotes aren&apos;t shown here. Open it on that device to
            see each message in context.
          </span>
        </p>
      ) : null}
      {present.map((section) => {
        const items: CatchUpItem[] = [...catchup[section.key]].sort((a, b) => a.at - b.at);
        return (
          <section key={section.id} className="cu-section" id={`sec-${section.id}`} aria-labelledby={`h-${section.id}`}>
            <div className="cu-section__head">
              <Icon id={ITEM_META[section.type].icon} />
              <h2 id={`h-${section.id}`}>{section.title}</h2>
              <span className="count">{items.length}</span>
              {section.type === "deadline" ? <CalendarAll /> : null}
            </div>
            {items.map((item) => (
              <Card key={item.id} item={item} />
            ))}
          </section>
        );
      })}
    </div>
  );
}
