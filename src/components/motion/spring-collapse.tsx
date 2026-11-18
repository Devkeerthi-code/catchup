"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animateSpring } from "@/lib/ui/spring";

interface SpringCollapseProps {
  open: boolean;
  id: string;
  className?: string;
  children: ReactNode;
  role?: "region";
  labelledBy?: string;
}

/** Height expand/collapse on the "gentle" spring, ending on `auto` so content can reflow. */
export function SpringCollapse({ open, id, className, children, role, labelledBy }: SpringCollapseProps) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // Only the first render sets these attributes; after that the spring owns them.
  const [initialOpen] = useState(open);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      return;
    }
    el.hidden = false;
    const start = el.getBoundingClientRect().height;
    el.style.height = "auto";
    const end = open ? el.scrollHeight : 0;
    el.style.height = `${start}px`;
    el.style.overflow = "hidden";
    const peak = Math.max(end, start, 1);
    return animateSpring(
      start,
      end,
      "gentle",
      (v) => {
        el.style.height = `${Math.max(0, v)}px`;
        el.style.opacity = String(Math.min(1, Math.max(0, v / peak)));
      },
      () => {
        el.style.height = open ? "auto" : "0px";
        el.style.overflow = open ? "" : "hidden";
        el.style.opacity = "";
        el.hidden = !open;
      },
    );
  }, [open]);

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      role={role}
      aria-labelledby={labelledBy}
      hidden={!initialOpen}
      style={initialOpen ? undefined : { height: 0, overflow: "hidden" }}
    >
      {children}
    </div>
  );
}
