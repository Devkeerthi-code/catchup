"use client";

import { useId, type ReactNode } from "react";
import type { ChatOverview } from "@/lib/client/prepare";
import { localDateKey, plural } from "@/lib/ui/format";
import { MAX_DAYS, MIN_DAYS, type RangeChoice } from "@/lib/ui/range-choice";

interface RangePickerProps {
  chat: ChatOverview;
  value: RangeChoice;
  onChange: (next: RangeChoice) => void;
  disabled: boolean;
}

interface OptionProps {
  kind: RangeChoice["kind"];
  title: string;
  desc: string;
  value: RangeChoice;
  onChange: (next: RangeChoice) => void;
  disabled: boolean;
  children?: ReactNode;
}

function Option({ kind, title, desc, value, onChange, disabled, children }: OptionProps) {
  const id = useId();
  return (
    <div className="opt">
      <label className="opt__main">
        <input
          type="radio"
          name="range"
          value={kind}
          checked={value.kind === kind}
          disabled={disabled}
          aria-labelledby={`${id}-t`}
          aria-describedby={`${id}-d`}
          onChange={() => onChange({ ...value, kind })}
        />
        <span className="opt__title" id={`${id}-t`}>
          {title}
        </span>
        <span className="opt__desc" id={`${id}-d`}>
          {desc}
        </span>
      </label>
      {children && value.kind === kind ? <div className="opt__extra">{children}</div> : null}
    </div>
  );
}

function DaysStepper({ value, onChange, disabled }: { value: RangeChoice; onChange: (next: RangeChoice) => void; disabled: boolean }) {
  const set = (days: number) => onChange({ ...value, days: Math.min(MAX_DAYS, Math.max(MIN_DAYS, days)) });
  return (
    <span className="stepper">
      <button type="button" aria-label="One day fewer" disabled={disabled || value.days <= MIN_DAYS} onClick={() => set(value.days - 1)}>
        −
      </button>
      <output aria-live="polite">{plural(value.days, "day")}</output>
      <button type="button" aria-label="One day more" disabled={disabled || value.days >= MAX_DAYS} onClick={() => set(value.days + 1)}>
        +
      </button>
    </span>
  );
}

export function RangePicker({ chat, value, onChange, disabled }: RangePickerProps) {
  const people = chat.authors;
  return (
    <fieldset className="range">
      <legend className="legend">Catch me up from</legend>
      <div className="range__opts">
        {people.length ? (
          <Option kind="sinceMine" title="My last message" desc="Starts right after the last thing you sent." value={value} onChange={onChange} disabled={disabled}>
            <label className="visually-hidden" htmlFor="me">
              Which one is you?
            </label>
            <select
              className="select"
              id="me"
              value={value.author}
              disabled={disabled}
              aria-describedby="me-hint"
              onChange={(e) => onChange({ ...value, author: e.target.value })}
            >
              <option value="">Which one is you?</option>
              {people.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.count})
                </option>
              ))}
            </select>
            <span className="hint mt-1 block" id="me-hint">
              Names are shown only on this device.
            </span>
          </Option>
        ) : null}
        <Option kind="lastDays" title="The last few days" desc="Counted back from the newest message." value={value} onChange={onChange} disabled={disabled}>
          <DaysStepper value={value} onChange={onChange} disabled={disabled} />
        </Option>
        <Option kind="since" title="A specific date" desc="Everything since the morning of that day." value={value} onChange={onChange} disabled={disabled}>
          <label className="visually-hidden" htmlFor="since-date">
            Start date
          </label>
          <input
            className="input"
            id="since-date"
            type="date"
            value={value.date}
            disabled={disabled}
            min={chat.firstTime ? localDateKey(chat.firstTime) : undefined}
            max={chat.lastTime ? localDateKey(chat.lastTime) : undefined}
            onChange={(e) => onChange({ ...value, date: e.target.value })}
          />
        </Option>
        <Option kind="all" title="Everything" desc={`All ${plural(chat.messageCount, "message")} in this chat.`} value={value} onChange={onChange} disabled={disabled} />
      </div>
    </fieldset>
  );
}
