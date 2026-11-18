/**
 * DEMO DATA. A complete catch-up of a fictional class group, so the result screen can be tried
 * without an export. Dates are placed relative to today so deadlines behave like live ones.
 * Every name, number and message here is invented; the page labels it "Demo catch-up".
 */
import type { LocalRun } from "../client/local-store";
import { computeStats } from "../summary/assemble";
import type { CatchUp, QuoteMessage } from "../summary/types";
import { formatShortDate, localDateKey } from "../ui/format";

type Line = [hour: number, minute: number, author: string, text: string, key?: string];

const DAY = 86_400_000;

function weekday(time: number): string {
  return new Date(time).toLocaleDateString("en-IN", { weekday: "long" });
}

function lines(d: number): Line[] {
  const labDay = weekday(d + 2 * DAY);
  const visit = formatShortDate(d + 13 * DAY);
  const oldVisit = formatShortDate(d + 8 * DAY);
  return [
    [8, 9, "Member 2", "good morning"],
    [8, 11, "Member 9", "anyone has the record format?"],
    [8, 12, "Member 4", `Ma'am said DBMS lab record is due ${labDay} 9 AM in Lab 3, not next week. Bring the printed outputs also.`, "d1"],
    [8, 12, "Member 5", "what?? it was next week"],
    [8, 14, "Member 1", "Confirmed with ma'am, it's moved up."],
    [10, 58, "Member 12", `so are we going on ${oldVisit} or not`],
    [11, 2, "Member 8", "someone ask the CR pls"],
    [11, 5, "Member 1", `Final from HOD: industrial visit is ${visit}, not ${oldVisit}. Bus at 7 AM from main gate. Consent forms to me by Monday.`, "c1"],
    [11, 6, "Member 12", "finally"],
    [13, 18, "Member 3", "who has unit 4 notes"],
    [13, 20, "Member 9", "OS unit 4 notes, full scan: https://drive.google.com/drive/folders/demo-os-unit-4", "l1"],
    [13, 21, "Member 3", "thanks!!"],
    [14, 38, "Member 8", "which manual for the record?"],
    [14, 40, "Member 4", "<attached: DBMS_lab_manual_v2.pdf> use this one, v1 has wrong queries for exp 6", "f1"],
    [14, 41, "Member 8", "ok thanks"],
    [16, 12, "Member 1", "Sir asked if we can do an extra class"],
    [16, 15, "Member 1", "POLL: Extra class on Saturday? Sir wants to finish Unit 5.", "p1"],
    [16, 16, "Member 10", "after lab is fine"],
    [19, 28, "Member 3", "is the hackathon inter-college?"],
    [19, 30, "Member 7", `Hackathon registrations close ${weekday(d + 5 * DAY)} 11:59 PM. Teams of 2 to 4, one form per team. Link below.`, "d2"],
    [19, 32, "Member 7", "https://forms.gle/demo-hackathon-team (one per team)", "l2"],
    [19, 33, "Member 11", "need 1 more for our team, anyone?"],
    [21, 44, "Member 2", "300 is too much for some people"],
    [21, 47, "Member 4", "200 and we skip the cake?"],
    [21, 50, "Member 6", "Okay, fixing it at ₹200 each. Pay to [upi-id] by Wednesday, I'll share the sheet. Call [phone] if it fails.", "c2"],
    [21, 51, "Member 7", "done"],
    [21, 51, "Member 3", "+1"],
    [22, 29, "Member 5", "[sticker]"],
    [22, 30, "Member 12", "Is the 2nd-year bus at 7:40 or 8:10 tomorrow? Lab is at 9.", "q1"],
    [22, 30, "Member 9", "haha"],
    [22, 31, "Member 2", "[voice note 0:12]"],
  ];
}

/** Fictional real names, so the "Show real names" switch can be tried. */
const PSEUDONYMS: [string, string][] = [
  ["Aditi Kulkarni", "Member 1"],
  ["Sneha Iyer", "Member 2"],
  ["Vikram Das", "Member 3"],
  ["Rahul Menon", "Member 4"],
  ["Priya Kannan", "Member 5"],
  ["Ananya Rao", "Member 6"],
  ["Karthik S", "Member 7"],
  ["Farhan Ali", "Member 8"],
  ["Meera Joshi", "Member 9"],
  ["Rohan Pillai", "Member 10"],
  ["Ishaan Gupta", "Member 11"],
  ["Divya Nair", "Member 12"],
];

function at(d: number, hour: number, minute: number): number {
  return d + hour * 3_600_000 + minute * 60_000;
}

/** A fixed, recognisable UUID so the demo has the same shape as a real catch-up. */
export const DEMO_RUN_ID = "00000000-0000-4000-8000-00000000d3e0";

export function buildDemoRun(now: number): LocalRun {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = today.getTime() - DAY;

  const quotes: QuoteMessage[] = lines(d).map(([h, m, author, text], i) => ({
    id: `m${i + 1}`,
    time: at(d, h, m),
    author,
    text,
    system: false,
  }));
  const byKey = new Map(lines(d).flatMap(([, , , , key], i) => (key ? [[key, quotes[i]] as const] : [])));
  const src = (key: string) => {
    const quote = byKey.get(key);
    if (!quote) throw new Error(`Demo data is missing ${key}`);
    return { sourceIds: [quote.id], at: quote.time };
  };

  const lab = new Date(d + 2 * DAY);
  const hack = new Date(d + 5 * DAY);
  const days = [412, 268, 590, 503, 455, 610, 1284].map((count, i) => ({ date: localDateKey(d - (6 - i) * DAY), count }));

  const catchup: CatchUp = {
    version: 1,
    id: DEMO_RUN_ID,
    title: "CSE-B 2nd Year",
    source: "whatsapp",
    formatLabel: "WhatsApp · Android · 24-hour · DD/MM (demo)",
    createdAt: now,
    range: { from: at(d, 7, 2), to: at(d, 23, 48) },
    stats: computeStats(1284, 1141, 9),
    tldr: [
      { text: `DBMS lab record is due ${weekday(lab.getTime())} 9:00 AM in Lab 3, moved up from next week.`, sourceIds: src("d1").sourceIds },
      { text: `Industrial visit is now ${formatShortDate(d + 13 * DAY)}; the bus leaves the main gate at 7 AM.`, sourceIds: src("c1").sourceIds },
      { text: "Farewell contribution is ₹200 each, paid to Member 6 by Wednesday.", sourceIds: src("c2").sourceIds },
      { text: "Most voted for an extra class on Saturday, right after the lab (18 of 34).", sourceIds: src("p1").sourceIds },
      { text: "Nobody has answered when tomorrow's 2nd-year bus leaves, 7:40 or 8:10.", sourceIds: src("q1").sourceIds },
    ],
    deadlines: [
      {
        id: "e1", type: "deadline", ...src("d1"), title: "DBMS lab record submission",
        date: localDateKey(lab.getTime()), time: "09:00", place: "Lab 3, CSE block, 2nd floor",
        changes: ["Date: next week → " + weekday(lab.getTime()), "Bring: record + printed outputs"],
      },
      {
        id: "e2", type: "deadline", ...src("d2"), title: "Hackathon team registration closes",
        date: localDateKey(hack.getTime()), time: "23:59", place: "Online form", changes: [],
      },
    ],
    decisions: [
      { id: "d1", type: "decision", ...src("c1"), text: `Industrial visit is on ${formatShortDate(d + 13 * DAY)}, not ${formatShortDate(d + 8 * DAY)}. Bus leaves the main gate at 7 AM; consent forms to Member 1 by Monday.` },
      { id: "d2", type: "decision", ...src("c2"), text: "Farewell contribution is ₹200 each, paid to Member 6 by Wednesday." },
    ],
    questions: [{ id: "q1", type: "question", ...src("q1"), question: "Is the 2nd-year bus at 7:40 or 8:10 tomorrow?", askedBy: "Member 12" }],
    polls: [
      {
        id: "p1", type: "poll", ...src("p1"), question: "Extra class on Saturday?",
        options: [{ text: "Yes, after the lab", votes: 18 }, { text: "No extra class", votes: 11 }, { text: "Online instead", votes: 5 }],
        result: "Yes, after the lab", closed: true,
      },
    ],
    links: [
      { id: "l1", type: "link", ...src("l1"), url: "https://drive.google.com/drive/folders/demo-os-unit-4", domain: "drive.google.com", shares: 4 },
      { id: "l2", type: "link", ...src("l2"), url: "https://forms.gle/demo-hackathon-team", domain: "forms.gle", shares: 3 },
    ],
    files: [{ id: "f1", type: "file", ...src("f1"), name: "DBMS_lab_manual_v2.pdf" }],
    insights: {
      totalMessages: 1284,
      noiseMessages: 1141,
      hours: [22, 9, 4, 2, 1, 1, 6, 31, 48, 26, 19, 24, 38, 29, 21, 27, 35, 44, 52, 61, 73, 96, 138, 117],
      days,
      members: [
        { name: "Member 7", count: 212 },
        { name: "Member 2", count: 168 },
        { name: "Member 12", count: 97 },
        { name: "Member 4", count: 81 },
        { name: "Member 9", count: 64 },
      ],
      domains: [
        { domain: "drive.google.com", count: 14 },
        { domain: "forms.gle", count: 6 },
        { domain: "youtube.com", count: 5 },
        { domain: "github.com", count: 2 },
      ],
      timeQuality: "exact",
    },
    warnings: [],
  };

  return { catchup, quotes, pseudonyms: PSEUDONYMS };
}
