import type { Metadata } from "next";
import { SavedList } from "@/components/saved/saved-list";

export const metadata: Metadata = { title: "Saved catch-ups" };

export default function SavedPage() {
  return (
    <main id="main" className="shell page-narrow">
      <div className="page-head">
        <span className="eyebrow">Your account</span>
        <h1>Saved catch-ups</h1>
        <p>Summaries you chose to keep. The chats themselves were never stored.</p>
      </div>
      <SavedList />
    </main>
  );
}
