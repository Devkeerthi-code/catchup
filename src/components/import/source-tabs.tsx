"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import type { IconId } from "@/lib/ui/items";
import type { Origin } from "./use-import";

const TABS: { id: Origin; label: string; icon: IconId }[] = [
  { id: "file", label: "Export file", icon: "u-upload" },
  { id: "paste", label: "Paste text", icon: "g-clipboard" },
  { id: "shot", label: "Screenshots", icon: "g-screenshot" },
];

interface SourceTabsProps {
  active: Origin;
  onChange: (tab: Origin) => void;
  panels: Record<Origin, ReactNode>;
}

/** WAI-ARIA tabs with a roving tabindex: arrows, Home and End move between tabs. */
export function SourceTabs({ active, onChange, panels }: SourceTabsProps) {
  const refs = useRef<Record<Origin, HTMLButtonElement | null>>({ file: null, paste: null, shot: null });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === active);
    const next =
      event.key === "ArrowRight" ? (i + 1) % TABS.length
      : event.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
      : event.key === "Home" ? 0
      : event.key === "End" ? TABS.length - 1
      : -1;
    if (next === -1) return;
    event.preventDefault();
    onChange(TABS[next].id);
    refs.current[TABS[next].id]?.focus();
  };

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="How to add your chat" onKeyDown={onKeyDown}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            className="tab"
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={tab.id === active}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => onChange(tab.id)}
          >
            <Icon id={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>
      {TABS.map((tab) => (
        <section
          key={tab.id}
          className="tabpanel"
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
        >
          {panels[tab.id]}
        </section>
      ))}
    </div>
  );
}
