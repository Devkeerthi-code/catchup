"use client";

import { MaskedText } from "@/components/ui/masked-text";
import { formatDayTime, formatTime } from "@/lib/ui/format";
import { avatarLabel, revealNames } from "@/lib/ui/names";
import type { QuoteMessage } from "@/lib/summary/types";
import { useCatchUpView } from "./catchup-context";

export function SourceQuote({ quote }: { quote: QuoteMessage }) {
  const { names } = useCatchUpView();
  const author = quote.author ? revealNames(quote.author, names) : "System message";
  return (
    <blockquote className="source">
      <p className="source__who">
        <span className="av" aria-hidden="true">
          {avatarLabel(author)}
        </span>
        <span>{author}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={new Date(quote.time).toISOString()} title={formatDayTime(quote.time)}>
          {formatTime(quote.time)}
        </time>
      </p>
      <p>
        <MaskedText text={quote.text} names={names} />
      </p>
    </blockquote>
  );
}

export function ContextList({ messages, sourceIds }: { messages: QuoteMessage[]; sourceIds: string[] }) {
  const { names } = useCatchUpView();
  const cited = new Set(sourceIds);
  return (
    <ol className="context__list" aria-label="Messages around the source">
      {messages.map((m) => (
        <li key={m.id} className={cited.has(m.id) ? "is-source" : undefined}>
          <time dateTime={new Date(m.time).toISOString()}>{formatTime(m.time)}</time>
          <span>
            <b>{m.author ? revealNames(m.author, names) : "System"}</b>
            <MaskedText text={m.text} names={names} />
          </span>
        </li>
      ))}
    </ol>
  );
}
