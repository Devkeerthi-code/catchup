import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface CatchUpMissingProps {
  title: string;
  body: string;
  action?: { href: string; label: string };
}

/** Empty / not-found state for the result routes, drawn with the noise motif. */
export function CatchUpMissing({ title, body, action = { href: "/import", label: "Make a new catch-up" } }: CatchUpMissingProps) {
  return (
    <main id="main" className="shell">
      <div className="empty-state">
        <div className="noise empty-state__noise" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <h1>{title}</h1>
        <p>{body}</p>
        <Link className="btn btn--primary" href={action.href}>
          <span className="btn__dot" aria-hidden="true" />
          {action.label}
          <Icon id="u-arrow" />
        </Link>
      </div>
    </main>
  );
}
