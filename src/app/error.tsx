"use client";

import { Icon } from "@/components/ui/icon";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="shell">
      <div className="empty-state">
        <div className="noise empty-state__noise" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <h1>Something broke on this page</h1>
        <p>Your chat is safe: nothing was sent or stored because of this. Try again, and if it keeps happening, reload the page.</p>
        <button className="btn btn--primary" type="button" onClick={() => retry()}>
          <Icon id="u-replay" />
          Try again
        </button>
      </div>
    </main>
  );
}
