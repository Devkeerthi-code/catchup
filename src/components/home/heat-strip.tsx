import { DEMO_HOURS } from "@/lib/demo/hero-chat";

export function HeatStrip() {
  const max = Math.max(...DEMO_HOURS);
  return (
    <div>
      <div className="heat" role="img" aria-label="Messages per hour in the demo chat. Busiest between 10 PM and midnight.">
        {DEMO_HOURS.map((v, h) => (
          <span
            key={h}
            className={`heat__cell${v >= 110 ? " is-peak" : ""}`}
            style={{ opacity: v >= 110 ? 1 : Number((0.08 + (v / max) * 0.8).toFixed(2)) }}
            title={`${h}:00 to ${h + 1}:00, ${v} messages`}
          />
        ))}
      </div>
      <div className="heat__axis" aria-hidden="true">
        <span>12 AM</span>
        <span>6 AM</span>
        <span>12 PM</span>
        <span>6 PM</span>
        <span>11 PM</span>
      </div>
    </div>
  );
}
