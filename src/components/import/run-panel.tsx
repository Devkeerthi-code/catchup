"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/icon";
import type { PreparedChat } from "@/lib/client/prepare";
import type { RunProgress } from "@/lib/client/run-catchup";
import { plural } from "@/lib/ui/format";
import { Spring } from "@/lib/ui/spring";
import type { RunState } from "./use-catchup-run";

interface RunPanelProps {
  prepared: PreparedChat | null;
  preparing: boolean;
  incomplete: string | null;
  prepareError: string | null;
  run: RunState;
  onStart: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}

function percent(progress: RunProgress | null, done: number, total: number): number {
  if (!progress) return 4;
  if (progress.stage === "merging") return 94;
  return 6 + (84 * done) / Math.max(1, total);
}

function stageLabel(progress: RunProgress | null): string {
  if (!progress) return "Starting…";
  if (progress.stage === "reading") return `Reading part ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…`;
  if (progress.stage === "merging") return "Merging duplicates and writing the TL;DR…";
  return `Free AI quota is busy, retrying in ${progress.seconds} s`;
}

/** The progress bar follows the run on the "settle" spring, so it never jumps. */
function useProgressBar(value: number) {
  const fill = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  useEffect(() => {
    const el = fill.current;
    if (!el) return;
    const s = new Spring(0, "settle", (v) => (el.style.transform = `scaleX(${Math.max(0, Math.min(100, v)) / 100})`));
    spring.current = s;
    return () => s.stop();
  }, []);
  useEffect(() => {
    spring.current?.to(value);
  }, [value]);
  return fill;
}

interface ProgressProps {
  progress: RunProgress | null;
  done: number;
  total: number;
  onCancel: () => void;
}

function Progress({ progress, done, total, onCancel }: ProgressProps) {
  const value = percent(progress, done, total);
  const fill = useProgressBar(value);
  const stage = (n: 0 | 1 | 2) => {
    const at = !progress || progress.stage === "reading" || progress.stage === "waiting" ? 1 : 2;
    return n < at ? "is-done" : n === at ? "is-active" : "";
  };

  return (
    <div className="progress" aria-live="polite">
      <div className="progress__head">
        <h2>{stageLabel(progress)}</h2>
        <span className="progress__pct">{Math.round(value)}%</span>
      </div>
      <div className="progress__track" role="progressbar" aria-label="Catch-up progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}>
        <div className="progress__fill" ref={fill} />
      </div>
      <ol className="stages">
        <li className={stage(0)}>Read and masked on this device</li>
        <li className={stage(1)}>
          Finding deadlines, decisions, links and questions
          <span className="num">{total ? `${done} / ${total} parts` : ""}</span>
        </li>
        <li className={stage(2)}>Merging repeats and changes, then the TL;DR</li>
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn--secondary btn--sm" type="button" onClick={onCancel}>
          <Icon id="u-close" />
          Cancel
        </button>
        <span className="hint">The free AI quota can be slow; each part takes 10 to 20 seconds. You can keep this tab in the background.</span>
      </div>
    </div>
  );
}

function RunError({ message, onRetry, onDismiss }: { message: string; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div className="errorbox" role="alert">
      <h2>
        <Icon id="u-alert" />
        The catch-up didn&apos;t finish
      </h2>
      <p className="text-sm text-ink-2">{message}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn--primary" type="button" onClick={onRetry}>
          <Icon id="u-replay" />
          Try again
        </button>
        <button className="btn btn--ghost" type="button" onClick={onDismiss}>
          Change the range
        </button>
      </div>
    </div>
  );
}

function hintFor(props: RunPanelProps): string {
  if (props.incomplete) return props.incomplete;
  if (props.prepareError) return props.prepareError;
  if (props.preparing || !props.prepared) return "Counting what will be sent…";
  const p = props.prepared;
  if (p.tooLarge) return "";
  if (!p.messages.length) return "";
  if (!p.signalCount) return "";
  return `Sends ${plural(p.signalCount, "message")} in ${plural(p.chunks.length, "part")}. About ${Math.max(15, p.chunks.length * 15 + 10)} seconds.`;
}

/** The main button, plus every state around it: too large, empty range, running, failed. */
export function RunPanel(props: RunPanelProps) {
  const { prepared, preparing, incomplete, run, onStart, onCancel, onDismiss } = props;
  if (run.status === "running") return <Progress progress={run.progress} done={run.done} total={run.total} onCancel={onCancel} />;
  if (run.status === "error") return <RunError message={run.message} onRetry={onStart} onDismiss={onDismiss} />;

  const ready = !!prepared && !preparing && !incomplete && !prepared.tooLarge && prepared.signalCount > 0;
  return (
    <div className="run">
      {prepared && !preparing && prepared.tooLarge ? (
        <p className="notice">
          <Icon id="u-alert" />
          <span>
            This range would need {prepared.tooLarge.chunks} parts, and one catch-up can send up to {prepared.tooLarge.max} on the free quota.
            Pick a shorter range, like the last few days.
          </span>
        </p>
      ) : null}
      {prepared && !preparing && !prepared.tooLarge && !prepared.messages.length ? (
        <p className="notice">
          <Icon id="u-alert" />
          <span>No messages in this range. Try an earlier date or more days.</span>
        </p>
      ) : null}
      {prepared && !preparing && prepared.messages.length > 0 && !prepared.signalCount ? (
        <p className="notice">
          <Icon id="u-check" />
          <span>Only stickers, “ok”s and system messages in this range. Nothing to catch up on.</span>
        </p>
      ) : null}
      {prepared?.rangeNote && !preparing ? (
        <p className="notice">
          <Icon id="u-alert" />
          <span>{prepared.rangeNote}</span>
        </p>
      ) : null}
      <div className="cta-row">
        <button className="btn btn--primary" type="button" disabled={!ready || run.status === "done"} onClick={onStart}>
          <span className="btn__dot" aria-hidden="true" />
          {run.status === "done" ? "Opening your catch-up…" : "Make my catch-up"}
        </button>
        <span className="hint" aria-live="polite">
          {hintFor(props)}
        </span>
      </div>
    </div>
  );
}
