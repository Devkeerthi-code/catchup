"use client";

import { useEffect, useEffectEvent, useState } from "react";

const MIN_CHARS = 20;
const DEBOUNCE_MS = 600;

interface PasteInputProps {
  onText: (text: string) => void;
  onClear: () => void;
}

/** Reads the pasted messages a moment after typing stops; nothing is sent until the user asks. */
export function PasteInput({ onText, onClear }: PasteInputProps) {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  // Only a change of text should trigger a read, not a new callback identity from the parent.
  const settle = useEffectEvent((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length >= MIN_CHARS) onText(value);
    else if (!trimmed) onClear();
  });

  useEffect(() => {
    if (!touched) return;
    const timer = window.setTimeout(() => settle(text), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, touched]);

  const short = text.trim().length > 0 && text.trim().length < MIN_CHARS;
  return (
    <div className="field">
      <label htmlFor="paste">Paste messages</label>
      <textarea
        className="textarea"
        id="paste"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setTouched(true);
        }}
        aria-describedby="paste-hint"
        placeholder={"20/11/26, 8:12 am - Name: message\n20/11/26, 8:13 am - Name: message"}
      />
      <p className="hint" id="paste-hint">
        {short
          ? "Keep going: paste at least a couple of messages."
          : "Copy messages from WhatsApp, Telegram or anywhere with “Name: message” lines. They’re read in this tab as you paste; nothing is sent until you press Make my catch-up."}
      </p>
    </div>
  );
}
