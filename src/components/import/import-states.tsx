import { Icon } from "@/components/ui/icon";
import type { IconId } from "@/lib/ui/items";
import type { Origin } from "./use-import";

/** Matches the detected card's layout so nothing jumps when the result arrives. */
export function ReadingSkeleton({ label }: { label: string }) {
  return (
    <div className="skeleton" aria-busy="true" aria-live="polite">
      <p className="visually-hidden">Reading {label} on this device…</p>
      <div className="flex items-center gap-3">
        <span className="sk h-11 w-11 rounded-sm" />
        <div className="grid flex-1 gap-2">
          <span className="sk h-3.5 w-3/5" />
          <span className="sk h-2.5 w-1/3" />
        </div>
      </div>
      <span className="sk h-11 rounded-md" />
      <div className="kv">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk h-16" />
        ))}
      </div>
      <p className="hint" aria-hidden="true">
        Reading {label} in a background worker, so this tab stays responsive.
      </p>
    </div>
  );
}

const HELP: Record<Origin, string[]> = {
  file: ["Open the group in WhatsApp", "Tap the group name, then Export chat", "Pick Without media and choose the .txt or .zip here"],
  paste: ["Copy whole lines, including the name and time", "Each message should look like “Name: message”", "Or use the Export file tab instead"],
  shot: ["Use clear, uncropped screenshots", "Keep them in the order you scrolled", "Or export the chat and use the Export file tab"],
};

export function ImportError({ origin, message, label, onRetry, onSwitch }: { origin: Origin; message: string; label: string | null; onRetry: () => void; onSwitch: (to: Origin) => void }) {
  const alternative: { to: Origin; label: string; icon: IconId } =
    origin === "shot" ? { to: "paste", label: "Paste text instead", icon: "g-clipboard" } : { to: "shot", label: "Use screenshots instead", icon: "g-screenshot" };
  return (
    <div className="errorbox" role="alert">
      <h2>
        <Icon id="u-alert" />
        {origin === "file" ? "That file didn't work" : origin === "paste" ? "Those messages couldn't be read" : "Those screenshots couldn't be read"}
      </h2>
      <p className="text-sm text-ink-2">
        {label ? (
          <>
            <b className="break-anywhere">{label}</b>:{" "}
          </>
        ) : null}
        {message}
      </p>
      <ol>
        {HELP[origin].map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn--primary" type="button" onClick={onRetry}>
          Try again
        </button>
        <button className="btn btn--secondary" type="button" onClick={() => onSwitch(alternative.to)}>
          <Icon id={alternative.icon} />
          {alternative.label}
        </button>
      </div>
    </div>
  );
}

const APPS: { icon: IconId; name: string; note: string }[] = [
  { icon: "g-bubble", name: "WhatsApp", note: ".txt or .zip" },
  { icon: "g-plane", name: "Telegram", note: "result.json" },
  { icon: "g-hash", name: "Slack", note: "Channel JSON / zip" },
  { icon: "g-headset", name: "Discord", note: "JSON or CSV" },
  { icon: "g-heart", name: "Instagram", note: "DM JSON" },
  { icon: "g-bubbles", name: "Messenger", note: "JSON" },
  { icon: "g-clipboard", name: "Pasted text", note: "Name: message lines" },
  { icon: "g-screenshot", name: "Screenshots", note: "Read by Gemini" },
];

export function SupportedApps() {
  return (
    <section className="apps" id="apps" aria-labelledby="apps-title">
      <h2 id="apps-title">Works with exports from</h2>
      <ul className="apps__grid">
        {APPS.map((app) => (
          <li key={app.name} className="app-tile">
            <Icon id={app.icon} />
            <span>
              {app.name}
              <small>{app.note}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
