"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { MaskedText } from "@/components/ui/masked-text";
import type { PreparedChat } from "@/lib/client/prepare";
import { isNoise } from "@/lib/chat/text";
import { formatTime, plural } from "@/lib/ui/format";
import { pseudonymLookup, revealNames } from "@/lib/ui/names";

const SAMPLE = 4;

interface PrivacyPreviewProps {
  prepared: PreparedChat | null;
  pending: boolean;
  hasChat: boolean;
}

function EmptyPreview() {
  return (
    <div className="preview-empty">
      <div className="noise" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p>Add a chat and the first few messages appear here exactly as they would be sent: names as Member N, numbers and emails hidden.</p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <ul className="preview-lines" aria-busy="true" aria-label="Preparing the preview">
      {[70, 90, 60].map((w) => (
        <li key={w} className="grid gap-2">
          <span className="sk h-3 w-20" />
          <span className="sk h-4" style={{ width: `${w}%` }} />
        </li>
      ))}
    </ul>
  );
}

/** The first few sanitised messages from the chosen range, plus what will and won't be sent. */
export function PrivacyPreview({ prepared, pending, hasChat }: PrivacyPreviewProps) {
  const [reveal, setReveal] = useState(false);
  const names = useMemo(() => (reveal && prepared ? pseudonymLookup(prepared.pseudonyms) : null), [reveal, prepared]);
  const sample = useMemo(() => (prepared ? prepared.messages.filter((m) => !isNoise(m)).slice(0, SAMPLE) : []), [prepared]);

  return (
    <div className="panel privacy">
      <div className="privacy__head">
        <div>
          <h2 id="privacy-title">What leaves this device</h2>
          <p>{prepared ? "The first messages of your range, exactly as they'd be sent." : "Shown here before anything is sent."}</p>
        </div>
        {prepared && prepared.pseudonyms.length ? (
          <label className="switch">
            <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
            <span className="switch__track" aria-hidden="true" />
            Show real names
          </label>
        ) : null}
      </div>
      {!hasChat ? <EmptyPreview /> : pending || !prepared ? <PreviewSkeleton /> : null}
      {hasChat && prepared && !pending ? (
        sample.length ? (
          <ul className="preview-lines">
            {sample.map((m) => (
              <li key={m.id}>
                <span className="who">
                  {m.author ? revealNames(m.author, names) : "System"} · {formatTime(m.time)}
                </span>
                {m.text ? (
                  <MaskedText text={m.text} names={names} />
                ) : (
                  <span className="chip-meta">{m.attachments.length ? `Attachment${m.attachments[0].name ? `: ${m.attachments[0].name}` : ""}` : "Empty message"}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="privacy__count">No messages to send in this range.</p>
        )
      ) : null}
      {hasChat && prepared && !pending ? (
        <p className="privacy__count">
          {prepared.signalCount
            ? `${plural(prepared.signalCount, "message")} will be sent in ${plural(prepared.chunks.length, "part")}. ${plural(prepared.messages.length - prepared.signalCount, "noise message")} skipped.`
            : "Nothing will be sent for this range."}
          {reveal ? " Real names are shown on your screen only." : ""}
        </p>
      ) : null}
      <ul className="leaves">
        <li className="yes">
          <Icon id="u-check" />
          <span>Masked message text from your chosen range</span>
        </li>
        <li className="no">
          <Icon id="u-close" />
          <span>Names, phone numbers, emails, UPI IDs</span>
        </li>
        <li className="no">
          <Icon id="u-close" />
          <span>Photos, voice notes, files, the raw export</span>
        </li>
      </ul>
    </div>
  );
}
