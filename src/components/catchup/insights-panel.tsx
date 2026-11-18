"use client";

import { useSpringBars } from "@/components/motion/spring-bars";
import { Icon } from "@/components/ui/icon";
import { formatCount, formatDateKey, hourLabel } from "@/lib/ui/format";
import { revealNames } from "@/lib/ui/names";
import type { Insights } from "@/lib/insights";
import { useCatchUpView } from "./catchup-context";

const DAYS_SHOWN = 14;

function HoursChart({ hours }: { hours: number[] }) {
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(max);
  const peakCut = max * 0.8;
  return (
    <div className="chart">
      <h3>Busiest hours</h3>
      <p>
        Peak: {hourLabel(peak)} to {hourLabel(peak + 1)}, {formatCount(max)} messages
      </p>
      <svg viewBox="0 0 240 78" role="img" aria-label={`Messages per hour of the day. Peak ${hourLabel(peak)} with ${max} messages.`}>
        {hours.map((v, h) => {
          const height = (v / max) * 56;
          return (
            <rect key={h} className={`bar${v >= peakCut && v > 0 ? " is-peak" : ""}`} x={h * 10} y={60 - height} width="7" height={height} rx="1.5">
              <title>{`${hourLabel(h)}: ${v} messages`}</title>
            </rect>
          );
        })}
        {[["12a", 0], ["6a", 60], ["12p", 120], ["6p", 180], ["11p", 230]].map(([t, x]) => (
          <text key={t} className="axis" x={x} y="74">
            {t}
          </text>
        ))}
      </svg>
    </div>
  );
}

function DaysChart({ days }: { days: Insights["days"] }) {
  const shown = days.slice(-DAYS_SHOWN);
  if (shown.length < 2) return null;
  const max = Math.max(1, ...shown.map((d) => d.count));
  const step = 220 / (shown.length - 1);
  const pts = shown.map((d, i) => [10 + i * step, 66 - (d.count / max) * 56] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},66 L${pts[0][0].toFixed(1)},66 Z`;
  const busiest = shown.reduce((a, b) => (b.count > a.count ? b : a));
  const labelEvery = Math.ceil(shown.length / 7);
  return (
    <div className="chart">
      <h3>Messages per day</h3>
      <p>
        Busiest: {formatDateKey(busiest.date)}, {formatCount(busiest.count)} messages
      </p>
      <svg viewBox="0 0 240 86" role="img" aria-label={`Messages per day over ${shown.length} days. Busiest ${formatDateKey(busiest.date)}.`}>
        <path className="area" d={area} />
        <path className="line" d={line} />
        {pts.map(([x, y], i) => (
          <circle key={shown[i].date} className="dot" cx={x} cy={y} r="3">
            <title>{`${formatDateKey(shown[i].date)}: ${shown[i].count}`}</title>
          </circle>
        ))}
        {pts.map(([x], i) =>
          i % labelEvery === 0 || i === pts.length - 1 ? (
            <text key={shown[i].date} className="axis" x={x} y="82" textAnchor="middle">
              {formatDateKey(shown[i].date).split(" ")[0].replace(",", "")}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function HBars({ title, note, rows }: { title: string; note: string; rows: { label: string; value: number }[] }) {
  const ref = useSpringBars<HTMLUListElement>(80);
  if (!rows.length) return null;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="chart">
      <h3>{title}</h3>
      <p>{note}</p>
      <ul className="hbars" ref={ref}>
        {rows.map((r) => (
          <li key={r.label}>
            <span className="hbars__name" title={r.label}>
              {r.label}
            </span>
            <span className="hbars__track" aria-hidden="true">
              <span className="hbars__fill" data-fill={(r.value / max).toFixed(3)} />
            </span>
            <span className="hbars__val">{formatCount(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Counted in the browser from the masked messages; no AI involved, nothing extra sent. */
export function InsightsPanel() {
  const { catchup, names } = useCatchUpView();
  const { insights } = catchup;
  const estimated = insights.timeQuality === "estimated";
  const topShare = insights.members.slice(0, 5).reduce((n, m) => n + m.count, 0);
  const written = insights.totalMessages - insights.noiseMessages;
  return (
    <div className="panel insights">
      <div className="insights__head">
        <h2 id="ins-title">Group insights</h2>
        <p>
          <Icon id="u-device" />
          Counted on your device from this range.
        </p>
        {estimated ? <p className="insights__warn">This chat had no timestamps, so hours and days are estimates.</p> : null}
      </div>
      <HoursChart hours={insights.hours} />
      <DaysChart days={insights.days} />
      <HBars
        title="Most active"
        note={
          insights.members.length >= 5 && written > 0
            ? `The top 5 wrote ${Math.min(100, Math.round((topShare / insights.totalMessages) * 100))}% of messages.`
            : "By number of messages."
        }
        rows={insights.members.map((m) => ({ label: revealNames(m.name, names), value: m.count }))}
      />
      <HBars
        title="Most shared sites"
        note="Every time a link to the site was posted"
        rows={insights.domains.map((d) => ({ label: d.domain, value: d.count }))}
      />
    </div>
  );
}
