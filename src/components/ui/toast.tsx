"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Spring } from "@/lib/ui/spring";
import { Icon } from "./icon";

type ToastKind = "success" | "error";
interface ToastEntry {
  id: number;
  message: string;
  kind: ToastKind;
}

type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn>(() => undefined);

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

const VISIBLE_MS = 4200;

function Toast({ entry, onGone }: { entry: ToastEntry; onGone: (id: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spring = new Spring(24, "lift", (v) => {
      el.style.transform = `translateY(${v}px)`;
      el.style.opacity = String(1 - Math.min(1, Math.max(0, v / 24)));
    });
    spring.to(0);
    const timer = setTimeout(() => spring.to(24, () => onGone(entry.id)), VISIBLE_MS);
    return () => {
      clearTimeout(timer);
      spring.stop();
    };
  }, [entry.id, onGone]);

  return (
    <div ref={ref} className={`toast toast--${entry.kind}`} style={{ opacity: 0 }}>
      <Icon id={entry.kind === "error" ? "u-alert" : "u-check"} />
      <span>{entry.message}</span>
    </div>
  );
}

/** Toasts confirm actions and surface errors; important errors are also shown inline. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const show = useCallback<ToastFn>((message, kind = "success") => {
    const id = nextId.current++;
    setToasts((list) => [...list.filter((t) => t.message !== message), { id, message, kind }].slice(-3));
  }, []);

  const remove = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} entry={t} onGone={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
