"use client";

import { useCallback, useRef, useState } from "react";
import { describeRange, toRangeSpec } from "@/lib/ui/range-choice";
import { DetectedCard } from "./detected-card";
import { FileDrop, filesLabel } from "./file-drop";
import { ImportError, ReadingSkeleton, SupportedApps } from "./import-states";
import { PasteInput } from "./paste-input";
import { PrivacyPreview } from "./privacy-preview";
import { RangePicker } from "./range-picker";
import { RunPanel } from "./run-panel";
import { ScreenshotInput } from "./screenshot-input";
import { SourceTabs } from "./source-tabs";
import { useCatchUpRun } from "./use-catchup-run";
import { type Origin, useImport } from "./use-import";
import { usePrepared } from "./use-prepared";

/** Empty → reading → detected → range → privacy preview → run → open the catch-up. */
export function ImportFlow() {
  const [tab, setTab] = useState<Origin>("file");
  const imp = useImport();
  const run = useCatchUpRun();
  const { state, chat, range } = imp;
  const spec = range ? toRangeSpec(range) : null;
  const loaded = state.status === "loaded" ? state : null;
  const prepare = usePrepared(imp.worker, loaded?.version ?? null, chat?.index ?? 0, spec);
  const prepared = prepare.current?.status === "ready" ? prepare.current.prepared : null;
  const busy = run.state.status === "running" || run.state.status === "done";
  const lastFiles = useRef<File[]>([]);

  const onFiles = useCallback(
    (files: File[]) => {
      lastFiles.current = files;
      void imp.readFiles(files, filesLabel(files));
    },
    [imp],
  );
  const { readText, reset } = imp;
  const onClearPaste = () => {
    if (state.status !== "empty" && state.origin === "paste") reset();
  };

  const retry = () => {
    if (state.status !== "error") return;
    if (state.origin === "file" && lastFiles.current.length) onFiles(lastFiles.current);
    else reset();
  };

  const incomplete =
    range?.kind === "sinceMine" && !range.author ? "Choose which one is you." : range?.kind === "since" && !spec ? "Pick a start date." : null;

  const showFileDrop = !(loaded?.origin === "file") && !(state.status === "reading" && state.origin === "file");

  return (
    <div className="import-grid">
      <div>
        <SourceTabs
          active={tab}
          onChange={setTab}
          panels={{
            file: showFileDrop ? <FileDrop onFiles={onFiles} disabled={busy} /> : null,
            paste: <PasteInput onText={readText} onClear={onClearPaste} />,
            shot: <ScreenshotInput onRead={imp.readScreenshots} busy={state.status === "reading" && state.origin === "shot"} />,
          }}
        />

        <div className="import-status">
          {state.status === "reading" ? <ReadingSkeleton label={state.label} /> : null}
          {state.status === "error" ? (
            <ImportError origin={state.origin} message={state.message} label={state.label} onRetry={retry} onSwitch={(to) => { setTab(to); reset(); }} />
          ) : null}
          {loaded && chat ? (
            <DetectedCard loaded={loaded} chat={chat} onPick={imp.pickChat} onRemove={reset} locked={busy} />
          ) : null}
        </div>

        {loaded && chat && range ? (
          <>
            <RangePicker chat={chat} value={range} onChange={imp.setRange} disabled={busy} />
            <p className="hint mt-2">{describeRange(range)}.</p>
            <RunPanel
              prepared={prepared}
              preparing={prepare.pending}
              incomplete={incomplete}
              prepareError={prepare.current?.status === "error" ? prepare.current.message : null}
              run={run.state}
              onStart={() => {
                if (prepared && chat) void run.start(chat, prepared);
              }}
              onCancel={run.cancel}
              onDismiss={run.dismiss}
            />
          </>
        ) : null}

        <SupportedApps />
      </div>

      <aside className="import-aside" aria-labelledby="privacy-title">
        <PrivacyPreview prepared={prepared} pending={prepare.pending || state.status === "reading"} hasChat={!!loaded || state.status === "reading"} />
      </aside>
    </div>
  );
}
