"use client";

import { Icon } from "@/components/ui/icon";
import { MaskedText } from "@/components/ui/masked-text";
import { PollBars } from "@/components/ui/poll-bars";
import { useToast } from "@/components/ui/toast";
import { deadlineUrgency } from "@/lib/ui/deadline";
import { formatDateKey } from "@/lib/ui/format";
import { revealNames } from "@/lib/ui/names";
import type { DecisionItem, DeadlineItem, FileItem, LinkItem, PollItem, QuestionItem } from "@/lib/summary/types";
import { useCatchUpView } from "./catchup-context";
import { saveCalendar } from "./calendar";
import { copyText } from "./copy";
import { ItemCard } from "./item-card";

function timeLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function DeadlineCard({ item }: { item: DeadlineItem }) {
  const { catchup, names, now, demo } = useCatchUpView();
  const toast = useToast();
  const urgency = deadlineUrgency(item, now);
  const when = item.date ? `${formatDateKey(item.date)}${item.time ? `, ${timeLabel(item.time)}` : ""}` : "Date not given in the chat";

  const addToCalendar = () => {
    const count = saveCalendar([item], catchup.title, demo);
    toast(count ? `Calendar file saved: ${item.title}` : "This deadline has no date, so it can't go in a calendar.", count ? "success" : "error");
  };

  return (
    <ItemCard
      item={item}
      title={<MaskedText text={item.title} names={names} />}
      chips={urgency.kind === "urgent" ? <span className="chip-urgent">{urgency.label}</span> : null}
      meta={urgency.kind === "urgent" ? (item.changes.length ? "Changed in the chat" : null) : urgency.label}
      actions={
        item.date ? (
          <button className="btn btn--primary btn--sm" type="button" onClick={addToCalendar}>
            <Icon id="u-cal-plus" />
            Add to calendar (.ics)
          </button>
        ) : null
      }
    >
      <dl className="facts">
        <div>
          <dt>
            <Icon id="u-clock" />
            <span className="visually-hidden">When</span>
          </dt>
          <dd>{when}</dd>
        </div>
        {item.place ? (
          <div>
            <dt>
              <Icon id="u-pin" />
              <span className="visually-hidden">Where</span>
            </dt>
            <dd>
              <MaskedText text={item.place} names={names} />
            </dd>
          </div>
        ) : null}
      </dl>
      {item.changes.length ? (
        <div className="changes">
          <p className="changes__title">What changed</p>
          <ul>
            {item.changes.map((change) => (
              <li key={change}>
                <MaskedText text={change} names={names} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ItemCard>
  );
}

export function DecisionCard({ item }: { item: DecisionItem }) {
  const { names } = useCatchUpView();
  return <ItemCard item={item} title={<MaskedText text={item.text} names={names} />} />;
}

export function QuestionCard({ item }: { item: QuestionItem }) {
  const { names } = useCatchUpView();
  const toast = useToast();
  const copy = async () => {
    const ok = await copyText(revealNames(item.question, names));
    toast(ok ? "Question copied. Paste it in the group with your answer." : "Couldn't copy. Select the text and copy it instead.", ok ? "success" : "error");
  };
  return (
    <ItemCard
      item={item}
      title={<MaskedText text={item.question} names={names} />}
      meta={item.askedBy ? `Asked by ${revealNames(item.askedBy, names)}` : "No answer found in the chat"}
      actions={
        <button className="btn btn--secondary btn--sm" type="button" onClick={copy}>
          <Icon id="g-clipboard" />
          Copy question to answer
        </button>
      }
    />
  );
}

export function PollCard({ item }: { item: PollItem }) {
  const { names } = useCatchUpView();
  const counted = item.options.every((o) => o.votes !== null);
  const total = item.options.reduce((sum, o) => sum + (o.votes ?? 0), 0);
  const meta = [counted ? `${total} votes` : null, item.closed ? "Closed" : "Still open when exported"].filter(Boolean).join(" · ");
  return (
    <ItemCard item={item} title={<MaskedText text={item.question} names={names} />} meta={meta}>
      {counted && item.options.length ? (
        <PollBars options={item.options.map((o) => ({ text: o.text, votes: o.votes ?? 0 }))} render={(t) => revealNames(t, names)} />
      ) : (
        <ul className="poll-options">
          {item.options.map((o) => (
            <li key={o.text}>{revealNames(o.text, names)}</li>
          ))}
        </ul>
      )}
      {item.result ? (
        <p className="answer">
          <Icon id="u-check" />
          <span>
            Result: <b>{revealNames(item.result, names)}</b>
          </span>
        </p>
      ) : null}
    </ItemCard>
  );
}

export function LinkCard({ item }: { item: LinkItem }) {
  return (
    <ItemCard
      item={item}
      title={item.domain}
      actions={
        <a className="btn btn--secondary btn--sm" href={item.url} target="_blank" rel="noopener noreferrer">
          <Icon id="u-external" />
          Open link
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      }
    >
      <div className="linkrow">
        <span className="favicon" aria-hidden="true">
          {item.domain.replace(/^www\./, "")[0]?.toUpperCase() ?? "#"}
        </span>
        <div>
          <div className="linkrow__domain">{item.domain}</div>
          <div className="linkrow__url">{item.url}</div>
        </div>
        {item.shares > 1 ? <span className="dupe">Shared {item.shares}×, kept once</span> : null}
      </div>
    </ItemCard>
  );
}

export function FileCard({ item }: { item: FileItem }) {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(item.name)?.[1]?.toUpperCase();
  return (
    <ItemCard item={item} title={<span className="break-anywhere">{item.name}</span>} meta={ext ? `${ext} file` : null}>
      <p className="item__desc">Exports leave out attachments, so the file isn&apos;t here. Ask in the group if you need it.</p>
    </ItemCard>
  );
}
