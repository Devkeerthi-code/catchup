"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatBytes } from "@/lib/ui/format";

const MAX_IMAGES = 4;
const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

function check(files: File[]): string | null {
  if (files.length > MAX_IMAGES) return `Pick up to ${MAX_IMAGES} screenshots at a time.`;
  const wrong = files.find((f) => !TYPES.includes(f.type));
  if (wrong) return `${wrong.name} isn't a PNG, JPEG or WebP image.`;
  const big = files.find((f) => f.size > MAX_BYTES);
  if (big) return `${big.name} is ${formatBytes(big.size)}. Each screenshot must be under 4 MB.`;
  return null;
}

interface ScreenshotInputProps {
  onRead: (files: File[]) => void;
  busy: boolean;
}

/** Screenshots are read by Google Gemini, so this is the one input that asks for consent first. */
export function ScreenshotInput({ onRead, busy }: ScreenshotInputProps) {
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);
  const [consent, setConsent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const urls = useRef<string[]>([]);
  const files = shots.map((s) => s.file);

  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const choose = (picked: File[]) => {
    const issue = check(picked);
    setProblem(issue);
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    const next = issue ? [] : picked.map((file) => ({ file, url: URL.createObjectURL(file) }));
    urls.current = next.map((s) => s.url);
    setShots(next);
  };

  return (
    <div className="shots">
      <div className="dropzone dropzone--short">
        <div className="dropzone__icon" aria-hidden="true">
          <Icon id="g-screenshot" />
        </div>
        <h2>Add up to 4 screenshots</h2>
        <p>Use this when you can&apos;t export the chat. Uncropped screenshots work best, in the order you scrolled.</p>
        <input
          className="dropzone__input"
          type="file"
          id="shot-input"
          accept={TYPES.join(",")}
          multiple
          disabled={busy}
          onChange={(e) => {
            choose([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <label className="btn btn--secondary" htmlFor="shot-input" aria-disabled={busy || undefined}>
          {files.length ? "Choose different screenshots" : "Choose screenshots"}
        </label>
      </div>
      {problem ? (
        <p className="field-error" role="alert">
          <Icon id="u-alert" />
          {problem}
        </p>
      ) : null}
      {shots.length ? (
        <ul className="shots__thumbs" aria-label="Chosen screenshots">
          {shots.map((shot) => (
            <li key={shot.url}>
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob previews; next/image can't optimise object URLs */}
              <img src={shot.url} alt={shot.file.name} />
            </li>
          ))}
        </ul>
      ) : null}
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} />
        <span>
          I understand these images are sent to Google Gemini to read the messages, because text in an image can&apos;t be masked first.
          CatchUp doesn&apos;t store them. Names and numbers are masked after they&apos;re read.
        </span>
      </label>
      <div className="cta-row mt-0">
        <button className="btn btn--primary" type="button" disabled={!files.length || !consent || busy} aria-busy={busy} onClick={() => onRead(files)}>
          {busy ? <span className="spinner" aria-hidden="true" /> : <span className="btn__dot" aria-hidden="true" />}
          {busy ? "Reading screenshots…" : "Read screenshots"}
        </button>
        <span className="hint">{!files.length ? "Choose screenshots first." : !consent ? "Tick the box above to continue." : "Usually 10 to 20 seconds."}</span>
      </div>
    </div>
  );
}
