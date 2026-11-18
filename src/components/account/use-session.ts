"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiClientError } from "@/lib/client/api";

export type SessionState =
  | { status: "loading" }
  | { status: "signed-in"; email: string }
  | { status: "signed-out" }
  | { status: "error"; message: string };

/** Who is logged in, from GET /api/auth/me. `refresh` re-checks after logging in or out. */
export function useSession(): [SessionState, () => void, (email: string | null) => void] {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch<{ user: { email: string } | null }>("/api/auth/me", { signal: controller.signal })
      .then(({ user }) => setState(user ? { status: "signed-in", email: user.email } : { status: "signed-out" }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState({ status: "error", message: error instanceof ApiClientError ? error.message : "Couldn't check your account." });
      });
    return () => controller.abort();
  }, [version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const set = useCallback((email: string | null) => setState(email ? { status: "signed-in", email } : { status: "signed-out" }), []);
  return [state, refresh, set];
}
