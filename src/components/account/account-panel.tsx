"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { AuthForm } from "./auth-form";
import { useSession } from "./use-session";

function SignedIn({ email, onSignedOut }: { email: string; onSignedOut: () => void }) {
  const [pending, setPending] = useState(false);
  const toast = useToast();

  const logout = async () => {
    setPending(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      toast("Logged out.");
      onSignedOut();
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : "Couldn't log out. Try again.", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="account-card">
      <div className="account-card__who">
        <span className="filecard__icon" aria-hidden="true">
          <Icon id="u-user" />
        </span>
        <div>
          <p className="chip-meta">Logged in as</p>
          <p className="account-card__email">{email}</p>
        </div>
      </div>
      <p className="text-sm text-ink-2">
        Your account stores the catch-ups you choose to save: summaries only, never chat text. Source quotes stay in the browser that
        made each catch-up.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link className="btn btn--primary" href="/saved">
          <Icon id="u-bookmark" />
          Saved catch-ups
        </Link>
        <button className="btn btn--secondary" type="button" onClick={logout} disabled={pending} aria-busy={pending}>
          {pending ? <span className="spinner" aria-hidden="true" /> : null}
          {pending ? "Logging out…" : "Log out"}
        </button>
      </div>
    </div>
  );
}

export function AccountPanel() {
  const [session, refresh, setSession] = useSession();

  if (session.status === "loading") {
    return (
      <div className="account-card" aria-busy="true" aria-label="Checking your account">
        <span className="sk h-11 w-2/3" />
        <span className="sk h-4 w-full" />
        <span className="sk h-11 w-40" />
      </div>
    );
  }
  if (session.status === "error") {
    return (
      <div className="errorbox" role="alert">
        <h2>
          <Icon id="u-alert" />
          Couldn&apos;t check your account
        </h2>
        <p className="text-sm">{session.message}</p>
        <div>
          <button className="btn btn--primary" type="button" onClick={refresh}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (session.status === "signed-in") return <SignedIn email={session.email} onSignedOut={() => setSession(null)} />;
  return (
    <div className="account-card">
      <AuthForm onAuthed={(email) => setSession(email)} />
    </div>
  );
}
