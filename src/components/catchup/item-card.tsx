"use client";

import { useState, type ReactNode } from "react";
import { SpringCollapse } from "@/components/motion/spring-collapse";
import { Icon } from "@/components/ui/icon";
import { formatTime } from "@/lib/ui/format";
import { contextAround, ITEM_META } from "@/lib/ui/items";
import type { CatchUpItem } from "@/lib/summary/types";
import { useCatchUpView } from "./catchup-context";
import { ContextList, SourceQuote } from "./source-quote";

interface ItemCardProps {
  item: CatchUpItem;
  title: ReactNode;
  chips?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}

const MAX_QUOTES = 2;

/** The receipt behind every item: type tag, the cited message(s), and the messages around them. */
export function ItemCard({ item, title, chips, meta, actions, children }: ItemCardProps) {
  const { quotes, quoteById } = useCatchUpView();
  const [open, setOpen] = useState(false);
  const type = ITEM_META[item.type];
  const cited = item.sourceIds.flatMap((id) => {
    const quote = quoteById.get(id);
    return quote ? [quote] : [];
  });
  const first = cited[0];
  const neighbours = first && quotes ? contextAround(quotes, first.id) : [];
  const titleId = `item-${item.id}-t`;
  const contextId = `ctx-${item.id}`;

  return (
    <article className={`card item${open ? " is-open" : ""}`} id={`item-${item.id}`} aria-labelledby={titleId}>
      <div className="item__top">
        <span className="tag">
          <Icon id={type.icon} />
          {type.label}
        </span>
        {chips}
        {meta ? <span className="chip-meta">{meta}</span> : null}
      </div>
      <h3 id={titleId}>{title}</h3>
      {children}
      {cited.slice(0, MAX_QUOTES).map((quote) => (
        <SourceQuote key={quote.id} quote={quote} />
      ))}
      {cited.length > MAX_QUOTES ? <p className="chip-meta">and {cited.length - MAX_QUOTES} more messages about this</p> : null}
      {actions || neighbours.length > 1 ? (
        <div className="item__actions">
          {actions}
          {neighbours.length > 1 ? (
            <button
              className="btn btn--ghost btn--sm ctx-btn"
              type="button"
              aria-expanded={open}
              aria-controls={contextId}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "Hide context" : "Open in context"}
              <Icon id="u-chevron" />
            </button>
          ) : null}
        </div>
      ) : null}
      {neighbours.length > 1 && first ? (
        <SpringCollapse open={open} id={contextId} className="context">
          <ContextList messages={neighbours} sourceIds={item.sourceIds} />
          <p className="context__note">
            {neighbours.length} messages around {formatTime(first.time)}. Names and numbers stay masked.
          </p>
        </SpringCollapse>
      ) : null}
    </article>
  );
}
