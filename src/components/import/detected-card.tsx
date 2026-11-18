"use client";

import { Icon } from "@/components/ui/icon";
import type { ChatOverview } from "@/lib/client/prepare";
import { formatCount, formatDuration, formatShortDate, plural } from "@/lib/ui/format";
import { SOURCE_META } from "@/lib/ui/items";
import type { Loaded } from "./use-import";

interface DetectedCardProps {
  loaded: Loaded;
  chat: ChatOverview;
  onPick: (index: number) => void;
  onRemove: () => void;
  locked: boolean;
}

/** What was found in the export: the format, the chat, its size and span, and any warnings. */
export function DetectedCard({ loaded, chat, onPick, onRemove, locked }: DetectedCardProps) {
  const source = SOURCE_META[chat.source];
  return (
    <div className="filecard">
      <div className="filecard__top">
        <span className="filecard__icon" aria-hidden="true">
          <Icon id={source.icon} />
        </span>
        <div>
          <div className="filecard__name">{loaded.label}</div>
          <div className="filecard__size">
            Read {plural(loaded.chats.reduce((n, c) => n + c.messageCount, 0), "message")} in {formatDuration(loaded.parseMs)}, on this
            device
          </div>
        </div>
        {!locked ? (
          <button className="btn btn--ghost btn--sm" type="button" onClick={onRemove}>
            <Icon id="u-close" />
            Remove
          </button>
        ) : null}
      </div>
      <div className="detected" role="status">
        <Icon id="u-check" />
        <span>
          Detected: <b>{chat.formatLabel}</b>
        </span>
      </div>
      {loaded.chats.length > 1 ? (
        <div className="field">
          <label htmlFor="chat-pick">This export has {loaded.chats.length} chats. Which one?</label>
          <select className="select" id="chat-pick" value={chat.index} disabled={locked} onChange={(e) => onPick(Number(e.target.value))}>
            {loaded.chats.map((c) => (
              <option key={c.index} value={c.index}>
                {(c.title ?? "Untitled chat") + ` · ${formatCount(c.messageCount)} messages`}
              </option>
            ))}
          </select>
          <span className="hint">Busiest first. Names and titles stay on this device.</span>
        </div>
      ) : null}
      <dl className="kv">
        <div>
          <dt>Chat</dt>
          <dd className="kv__text">{chat.title ?? "Untitled"}</dd>
        </div>
        <div>
          <dt>Messages</dt>
          <dd>{formatCount(chat.messageCount)}</dd>
        </div>
        <div>
          <dt>First</dt>
          <dd>{chat.firstTime ? formatShortDate(chat.firstTime) : "–"}</dd>
        </div>
        <div>
          <dt>Last</dt>
          <dd>{chat.lastTime ? formatShortDate(chat.lastTime) : "–"}</dd>
        </div>
      </dl>
      {chat.timeQuality === "estimated" ? (
        <p className="notice">
          <Icon id="u-clock" />
          <span>No timestamps in this text, so times are estimated from message order. Ranges by date may be rough.</span>
        </p>
      ) : null}
      {chat.warnings.map((w) => (
        <p key={w} className="notice">
          <Icon id="u-alert" />
          <span>{w}</span>
        </p>
      ))}
    </div>
  );
}
