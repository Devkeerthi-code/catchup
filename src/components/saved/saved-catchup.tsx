"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CatchUpMissing } from "@/components/catchup/catchup-missing";
import { CatchUpSkeleton } from "@/components/catchup/catchup-skeleton";
import { CatchUpView } from "@/components/catchup/catchup-view";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { loadRun, type LocalRun } from "@/lib/client/local-store";
import type { CatchUp } from "@/lib/summary/types";
import { ConfirmDelete } from "./confirm-delete";

type State =
  | { status: "loading" }
  | { status: "missing"; signedOut: boolean; message: string }
  | { status: "ready"; catchup: CatchUp; local: LocalRun | null };

/** A saved summary from the account; quotes are added only if this browser made it. */
export function SavedCatchUp({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ user: { email: string } | null }>("/api/auth/me", { signal: controller.signal })
      .then(async ({ user }) => {
        if (!user) return setState({ status: "missing", signedOut: true, message: "" });
        const { catchup } = await apiFetch<{ id: string; catchup: CatchUp }>(`/api/catchups/${encodeURIComponent(id)}`, { signal: controller.signal });
        setState({ status: "ready", catchup, local: loadRun(catchup.id) });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({
          status: "missing",
          signedOut: error instanceof ApiClientError && error.status === 401,
          message: error instanceof ApiClientError ? error.message : "Couldn't load this catch-up.",
        });
      });
    return () => controller.abort();
  }, [id]);

  if (state.status === "loading") return <CatchUpSkeleton />;
  if (state.status === "missing") {
    return state.signedOut ? (
      <CatchUpMissing title="Log in to open this catch-up" body="Saved catch-ups belong to an account." action={{ href: "/account", label: "Log in" }} />
    ) : (
      <CatchUpMissing title="That catch-up isn't here" body={state.message} action={{ href: "/saved", label: "Back to Saved" }} />
    );
  }

  const remove = async () => {
    try {
      await apiFetch(`/api/catchups/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast("Deleted from your account.");
      router.push("/saved");
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : "Couldn't delete. Try again.", "error");
    }
  };

  return (
    <CatchUpView
      catchup={state.catchup}
      quotes={state.local?.quotes.length ? state.local.quotes : null}
      pseudonyms={state.local?.pseudonyms ?? null}
      badge="Saved catch-up"
      actions={<ConfirmDelete what="this catch-up" onConfirm={remove} />}
    />
  );
}
