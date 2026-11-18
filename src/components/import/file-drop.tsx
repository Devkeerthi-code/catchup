"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { formatBytes } from "@/lib/ui/format";
import { Spring } from "@/lib/ui/spring";

const ACCEPT = ".txt,.zip,.json,.csv,text/plain,application/zip,application/json,text/csv";

export function filesLabel(files: File[]): string {
  const size = formatBytes(files.reduce((n, f) => n + f.size, 0));
  return files.length === 1 ? `${files[0].name} · ${size}` : `${files.length} files · ${size}`;
}

/** The drop zone lifts toward the file on a spring while something is dragged over it. */
function useLift() {
  const ref = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = new Spring(0, "lift", (v) => {
      el.style.transform = v ? `translateY(${-6 * v}px) scale(${1 + 0.012 * v})` : "";
    });
    spring.current = s;
    return () => s.stop();
  }, []);
  return { ref, lift: (on: boolean) => spring.current?.to(on ? 1 : 0) };
}

interface FileDropProps {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}

export function FileDrop({ onFiles, disabled }: FileDropProps) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const { ref, lift } = useLift();

  const setDragging = (on: boolean) => {
    setOver(on);
    lift(on);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    depth.current = 0;
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length && !disabled) onFiles(files);
  };

  return (
    <div
      ref={ref}
      className={`dropzone${over ? " is-over" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="dropzone__icon" aria-hidden="true">
        <Icon id="u-upload" />
      </div>
      <h2>Drop your chat export here</h2>
      <p>
        On WhatsApp: open the group, tap More, then Export chat, Without media. Save the file and choose it below. For Slack or Discord,
        you can pick several JSON files at once.
      </p>
      <div className="dropzone__types" aria-label="Accepted file types">
        <span>.txt</span>
        <span>.zip</span>
        <span>.json</span>
        <span>.csv</span>
      </div>
      <input
        className="dropzone__input"
        type="file"
        id="file-input"
        accept={ACCEPT}
        multiple
        disabled={disabled}
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      <label className="btn btn--primary" htmlFor="file-input" aria-disabled={disabled || undefined}>
        <span className="btn__dot" aria-hidden="true" />
        Choose a file
      </label>
    </div>
  );
}
