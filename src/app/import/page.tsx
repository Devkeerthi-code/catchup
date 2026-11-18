import type { Metadata } from "next";
import { ImportFlow } from "@/components/import/import-flow";

export const metadata: Metadata = {
  title: "Import a chat",
  description: "Drop a chat export, paste messages or add screenshots. Names and numbers are masked in your browser before anything is sent.",
};

export default function ImportPage() {
  return (
    <main id="main" className="shell">
      <div className="page-head">
        <span className="eyebrow">Make a catch-up</span>
        <h1>Bring in the chat you missed</h1>
        <p>Drop the export file, paste the messages, or add screenshots. Files and pasted text are read in this browser tab first.</p>
      </div>
      <ImportFlow />
    </main>
  );
}
