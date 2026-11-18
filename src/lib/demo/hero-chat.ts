/**
 * DEMO DATA. A fictional class group with fictional members, used only to illustrate the home
 * page. Nothing here comes from a real chat, and the UI labels it "Demo chat".
 */
import type { ItemType } from "../summary/types";

export interface DemoLine {
  who: string;
  text: string;
  type: ItemType | null;
}

export const DEMO_GROUP = "CSE-B 2nd Year";
export const DEMO_TOTAL = 1284;
export const DEMO_SIGNAL = 9;
export const DEMO_SPAN = "Fri 20 Nov, 7:02 AM to 11:48 PM. Fictional group, fictional members.";

export const DEMO_LINES: DemoLine[] = [
  { who: "Member 2", text: "good morning", type: null },
  { who: "Member 4", text: "DBMS lab record moved to tomorrow 9 AM, Lab 3", type: "deadline" },
  { who: "Member 9", text: "[sticker]", type: null },
  { who: "Member 5", text: "what?? it was monday", type: null },
  { who: "Member 2", text: "ok", type: null },
  { who: "Member 1", text: "Final: industrial visit is 3 Dec, not 28 Nov", type: "decision" },
  { who: "Member 11", text: "haha", type: null },
  { who: "Member 6", text: "[voice note 0:41]", type: null },
  { who: "Member 9", text: "OS unit 4 notes drive.google.com/…", type: "link" },
  { who: "Member 3", text: "+1", type: null },
  { who: "Member 8", text: "forwarded many times", type: null },
  { who: "Member 7", text: "Poll: extra class on Saturday? 18 yes, 11 no", type: "poll" },
  { who: "Member 5", text: "who all are coming canteen", type: null },
  { who: "Member 2", text: "[image omitted]", type: null },
  { who: "Member 4", text: "<DBMS_lab_manual_v2.pdf> use this one, not v1", type: "file" },
  { who: "Member 11", text: "send pls", type: null },
  { who: "Member 7", text: "Hackathon registration closes Wed 11:59 PM", type: "deadline" },
  { who: "Member 7", text: "forms.gle/… one form per team", type: "link" },
  { who: "Member 8", text: "[sticker]", type: null },
  { who: "Member 6", text: "Fixing farewell at ₹200 each, pay by Wed", type: "decision" },
  { who: "Member 4", text: "ok ok", type: null },
  { who: "Member 12", text: "Is the 2nd-year bus at 7:40 or 8:10 tomorrow?", type: "question" },
  { who: "Member 10", text: "lol", type: null },
  { who: "Member 3", text: "ok", type: null },
  { who: "Member 6", text: "good night all", type: null },
];

/** Messages per hour in the demo chat, 0 = midnight. */
export const DEMO_HOURS = [22, 9, 4, 2, 1, 1, 6, 31, 48, 26, 19, 24, 38, 29, 21, 27, 35, 44, 52, 61, 73, 96, 138, 117];

/** Demo numbers for the stats strip when this browser hasn't made a catch-up yet. */
export const DEMO_STATS = { messagesRead: 1284, noiseRemoved: 1141, minutesSaved: 52, signalItems: 9 };

/** Masking demo: each token flips between a fictional original and what is actually sent. */
export const DEMO_MASK_ROWS = [
  {
    who: { from: "Ananya Rao", to: "Member 3" },
    time: "9:14 PM",
    parts: [
      "Farewell money ₹200 each, send to ",
      { from: "ananya.rao@okaxis", to: "UPI ID hidden" },
      " or call ",
      { from: "98450 12345", to: "phone hidden" },
    ],
  },
  {
    who: { from: "Karthik S", to: "Member 7" },
    time: "9:20 PM",
    parts: ["Mail the list to ", { from: "karthik.s@example.com", to: "email hidden" }, " by Wednesday"],
  },
] as const;
