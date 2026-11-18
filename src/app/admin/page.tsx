import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminEmails } from "@/lib/server/env";
import { readSession } from "@/lib/server/session";
import { usageTotals } from "@/lib/server/usage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Usage", robots: { index: false, follow: false } };

const LABELS: Record<string, string> = {
  visitor: "Browsers that opened CatchUp",
  catchup_created: "Catch-ups made",
  catchup_saved: "Catch-ups saved to an account",
  account_created: "Accounts created",
  ics_downloaded: "Calendar files downloaded",
};

function label(action: string): string {
  if (LABELS[action]) return LABELS[action];
  if (action.startsWith("import_")) return `Imports: ${action.slice(7)}`;
  return action;
}

/** Counts only (per action per day). Hidden from everyone not listed in ADMIN_EMAILS. */
export default async function AdminPage() {
  const session = await readSession();
  if (!session || !adminEmails().has(session.email.toLowerCase())) notFound();
  const rows = await usageTotals();

  return (
    <main id="main" className="shell page-narrow">
      <div className="page-head">
        <span className="eyebrow">Admin</span>
        <h1>Usage</h1>
        <p>Anonymous daily counts. No ids, no chat content, nothing about who did what.</p>
      </div>
      {rows.length ? (
        <table className="usage-table">
          <caption className="visually-hidden">Usage counts by action</caption>
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Total</th>
              <th scope="col">Last 7 days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.action}>
                <th scope="row">
                  {label(row.action)}
                  <code>{row.action}</code>
                </th>
                <td>{row.total.toLocaleString("en-IN")}</td>
                <td>{row.last7.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="notice">Nothing has been counted yet.</p>
      )}
    </main>
  );
}
