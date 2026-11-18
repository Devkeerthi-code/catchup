"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthForm } from "@/components/account/auth-form";
import { useSession } from "@/components/account/use-session";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { CatchUp } from "@/lib/summary/types";

type SaveState = { status: "idle" } | { status: "saving" } | { status: "saved"; id: string } | { status: "error"; message: string };

/** Optional: stores the summary (never the chat or the quotes) in the user's account. */
export function SavePanel({ catchup }: { catchup: CatchUp }) {
  const [session, , setSession] = useSession();
  const [save, setSave] = useState<SaveState>({ status: "idle" });
  const toast = useToast();

  const doSave = async () => {
    if (save.status === "saving") return;
    setSave({ status: "saving" });
    try {
      const { id, created } = await apiFetch<{ id: string; created: boolean }>("/api/catchups", { method: "POST", json: { catchup } });
      setSave({ status: "saved", id });
      toast(created ? "Saved to your account." : "Already saved. Nothing was duplicated.");
    } catch (error) {
      const message = error instanceof ApiClientError ? error.message : "Couldn't save. Try again.";
      if (error instanceof ApiClientError && error.status === 401) setSession(null);
      setSave({ status: "error", message });
      toast(message, "error");
    }
  };

  return (
    <section className="save" aria-labelledby="save-title" aria-busy={session.status === "loading"}>
      <h2 id="save-title">Keep this catch-up</h2>
      <p>Optional. Saves the summary only, never the chat, so you can open it on another device. Source quotes stay in this browser.</p>
      {session.status === "loading" ? (
        <div className="grid gap-2" aria-label="Checking your account">
          <span className="sk h-11" />
        </div>
      ) : null}
      {session.status === "error" ? <p className="field-error">{session.message}</p> : null}
      {session.status === "signed-out" ? (
        <AuthForm onAuthed={(email) => setSession(email)} submitLabel={{ signup: "Create account", login: "Log in" }} />
      ) : null}
      {session.status === "signed-in" ? (
        save.status === "saved" ? (
          <div className="notice notice--accent">
            <Icon id="u-check" />
            <span>
              Saved to {session.email}. <Link href={`/saved/${save.id}`}>Open it from Saved</Link>
            </span>
          </div>
        ) : (
          <>
            <p className="chip-meta">Logged in as {session.email}</p>
            <button className="btn btn--secondary" type="button" onClick={doSave} disabled={save.status === "saving"} aria-busy={save.status === "saving"}>
              {save.status === "saving" ? <span className="spinner" aria-hidden="true" /> : <Icon id="u-bookmark" />}
              {save.status === "saving" ? "Saving…" : "Save catch-up"}
            </button>
            {save.status === "error" ? (
              <p className="field-error" role="alert">
                <Icon id="u-alert" />
                {save.message}
              </p>
            ) : null}
          </>
        )
      ) : null}
    </section>
  );
}
