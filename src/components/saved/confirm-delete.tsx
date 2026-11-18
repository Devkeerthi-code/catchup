"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

interface ConfirmDeleteProps {
  what: string;
  onConfirm: () => Promise<void>;
}

/** Two-step delete in place: the button turns into "Delete for good? Delete / Keep it". */
export function ConfirmDelete({ what, onConfirm }: ConfirmDeleteProps) {
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);

  if (!asking) {
    return (
      <button className="btn btn--ghost btn--sm" type="button" onClick={() => setAsking(true)}>
        <Icon id="u-trash" />
        Delete<span className="visually-hidden"> {what}</span>
      </button>
    );
  }

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
      setAsking(false);
    }
  };

  return (
    <span className="confirm" role="group" aria-label={`Delete ${what}?`}>
      <span className="confirm__q">Delete for good?</span>
      <button className="btn btn--danger btn--sm" type="button" disabled={pending} aria-busy={pending} autoFocus onClick={confirm}>
        {pending ? <span className="spinner" aria-hidden="true" /> : null}
        {pending ? "Deleting…" : "Delete"}
      </button>
      <button className="btn btn--secondary btn--sm" type="button" disabled={pending} onClick={() => setAsking(false)}>
        Keep it
      </button>
    </span>
  );
}
