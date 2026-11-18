"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AuthForm } from "@/components/account/auth-form";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { formatShortDate, formatSpan, plural } from "@/lib/ui/format";
import { SOURCE_META } from "@/lib/ui/items";
import type { CatchUp } from "@/lib/summary/types";
import { ConfirmDelete } from "./confirm-delete";

interface SavedRow {
  id: string;
  title: string;
  source: CatchUp["source"];
  rangeStart: string;
  rangeEnd: string;
  messageCount: number;
  itemCount: number;
  createdAt: string;
}

type ListState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: SavedRow[] };

function ListSkeleton() {
  return (
    <ul className="saved-list" aria-busy="true" aria-label="Loading saved catch-ups">
      {[0, 1, 2].map((i) => (
        <li key={i} className="saved-row">
          <span className="sk h-11 w-11" />
          <div className="grid flex-1 gap-2">
            <span className="sk h-4 w-1/2" />
            <span className="sk h-3 w-1/3" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptySaved() {
  return (
    <div className="empty-state empty-state--inline">
      <div className="noise empty-state__noise" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <h2>Nothing saved yet</h2>
      <p>After a catch-up, press Save catch-up and it shows up here, on any device you log in from. Only the summary is stored.</p>
      <Link className="btn btn--primary" href="/import">
        <span className="btn__dot" aria-hidden="true" />
        Catch up on a chat
      </Link>
    </div>
  );
}

function SavedRowItem({ row, onDelete }: { row: SavedRow; onDelete: (row: SavedRow) => Promise<void> }) {
  const source = SOURCE_META[row.source] ?? SOURCE_META.plaintext;
  return (
    <li className="saved-row">
      <span className="filecard__icon" aria-hidden="true">
        <Icon id={source.icon} />
      </span>
      <div className="saved-row__main">
        <Link className="saved-row__title" href={`/saved/${row.id}`}>
          {row.title}
        </Link>
        <p className="saved-row__meta">
          <span>{formatSpan(new Date(row.rangeStart).getTime(), new Date(row.rangeEnd).getTime())}</span>
          <span>
            {plural(row.itemCount, "item")} from {plural(row.messageCount, "message")}
          </span>
          <span>Saved {formatShortDate(new Date(row.createdAt).getTime())}</span>
        </p>
      </div>
      <ConfirmDelete what={row.title} onConfirm={() => onDelete(row)} />
    </li>
  );
}

export function SavedList() {
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [version, setVersion] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const controller = new AbortController();
    // Asking who is logged in first avoids a 401 (and a red console line) for signed-out visitors.
    apiFetch<{ user: { email: string } | null }>("/api/auth/me", { signal: controller.signal })
      .then(async ({ user }) => {
        if (!user) return setState({ status: "signed-out" });
        const { catchups } = await apiFetch<{ catchups: SavedRow[] }>("/api/catchups", { signal: controller.signal });
        setState({ status: "ready", rows: catchups });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof ApiClientError && error.status === 401) setState({ status: "signed-out" });
        else setState({ status: "error", message: error instanceof ApiClientError ? error.message : "Couldn't load your catch-ups." });
      });
    return () => controller.abort();
  }, [version]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setVersion((v) => v + 1);
  }, []);

  const remove = async (row: SavedRow) => {
    try {
      await apiFetch(`/api/catchups/${row.id}`, { method: "DELETE" });
      setState((s) => (s.status === "ready" ? { status: "ready", rows: s.rows.filter((r) => r.id !== row.id) } : s));
      toast(`Deleted "${row.title}".`);
    } catch (error) {
      toast(error instanceof ApiClientError ? error.message : "Couldn't delete. Try again.", "error");
    }
  };

  if (state.status === "loading") return <ListSkeleton />;
  if (state.status === "signed-out") {
    return (
      <div className="saved-auth">
        <div className="grid content-start gap-2">
          <h2>Log in to see your saved catch-ups</h2>
          <p>Saved catch-ups live in your account so you can open them on any device. Making a catch-up doesn&apos;t need an account.</p>
        </div>
        <AuthForm initialMode="login" onAuthed={reload} />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="errorbox" role="alert">
        <h2>
          <Icon id="u-alert" />
          Couldn&apos;t load your catch-ups
        </h2>
        <p className="text-sm">{state.message}</p>
        <div>
          <button className="btn btn--primary" type="button" onClick={reload}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!state.rows.length) return <EmptySaved />;

  return (
    <ul className="saved-list">
      {state.rows.map((row) => (
        <SavedRowItem key={row.id} row={row} onDelete={remove} />
      ))}
    </ul>
  );
}
