import { describe, expect, it } from "vitest";
import type { ChatOverview } from "@/lib/client/prepare";
import { buildDemoRun } from "@/lib/demo/demo-run";
import { catchUpSchema } from "@/lib/summary/catchup-schema";
import { deadlineUrgency } from "@/lib/ui/deadline";
import { localInstant } from "@/lib/ui/format";
import { contextAround } from "@/lib/ui/items";
import { pseudonymLookup, revealNames, splitMasked } from "@/lib/ui/names";
import { defaultRange, toRangeSpec } from "@/lib/ui/range-choice";
import { bandFor, groupByStripDay, stripDay } from "@/lib/ui/timeline";
import type { DecisionItem, QuoteMessage } from "@/lib/summary/types";

const at = (date: string, time: string) => localInstant(date, time);

describe("deadline urgency", () => {
  const now = at("2026-11-20", "10:00");

  it("is urgent (the only red state) within the next 24 hours", () => {
    expect(deadlineUrgency({ date: "2026-11-21", time: "09:00" }, now)).toEqual({ kind: "urgent", label: "Due in 23 h" });
  });

  it("is not urgent just past 24 hours, or once passed", () => {
    expect(deadlineUrgency({ date: "2026-11-21", time: "10:30" }, now).kind).toBe("upcoming");
    expect(deadlineUrgency({ date: "2026-11-20", time: "09:59" }, now).kind).toBe("passed");
  });

  it("treats a date without a time as the end of that day", () => {
    expect(deadlineUrgency({ date: "2026-11-20", time: null }, now)).toEqual({ kind: "urgent", label: "Due today" });
    expect(deadlineUrgency({ date: "2026-11-24", time: null }, now)).toEqual({ kind: "upcoming", label: "In 4 days" });
    expect(deadlineUrgency({ date: null, time: null }, now).kind).toBe("undated");
  });
});

describe("names and masked tokens", () => {
  it("reveals real names only for exact pseudonyms (Member 1 is not Member 12)", () => {
    const names = pseudonymLookup([["Diya Nair", "Member 1"], ["Kabir Rao", "Member 12"]]);
    expect(revealNames("Member 12 asked Member 1", names)).toBe("Kabir Rao asked Diya Nair");
    expect(revealNames("Member 3 left", names)).toBe("Member 3 left");
    expect(revealNames("Member 1", null)).toBe("Member 1");
  });

  it("splits masked tokens into labelled pieces", () => {
    expect(splitMasked("Pay [upi-id] or call [phone].")).toEqual([
      { kind: "text", text: "Pay " },
      { kind: "masked", label: "UPI ID hidden" },
      { kind: "text", text: " or call " },
      { kind: "masked", label: "phone hidden" },
      { kind: "text", text: "." },
    ]);
  });
});

describe("open in context", () => {
  const quote = (n: number): QuoteMessage => ({ id: `m${n}`, time: n, author: "Member 1", text: `t${n}`, system: false });

  it("keeps real neighbours and never jumps over a gap in the kept messages", () => {
    const quotes = [1, 2, 3, 4, 40, 41, 42].map(quote);
    expect(contextAround(quotes, "m4").map((q) => q.id)).toEqual(["m1", "m2", "m3", "m4"]);
    expect(contextAround(quotes, "m41").map((q) => q.id)).toEqual(["m40", "m41", "m42"]);
    expect(contextAround(quotes, "m99")).toEqual([]);
  });
});

describe("day timeline", () => {
  it("puts small hours into the night band of the evening before", () => {
    const late = at("2026-11-21", "01:30");
    expect(bandFor(late).id).toBe("night");
    expect(stripDay(late)).toBe("2026-11-20");
    expect(bandFor(at("2026-11-20", "08:00")).id).toBe("morning");
    expect(bandFor(at("2026-11-20", "17:00")).id).toBe("evening");
  });

  it("groups items by day, oldest first, in time order", () => {
    const item = (id: string, time: number): DecisionItem => ({ id, type: "decision", sourceIds: [], at: time, text: id });
    const days = groupByStripDay([item("b", at("2026-11-20", "21:00")), item("a", at("2026-11-19", "09:00")), item("c", at("2026-11-21", "02:00"))]);
    expect(days.map((d) => [d.date, d.items.map((i) => i.id)])).toEqual([
      ["2026-11-19", ["a"]],
      ["2026-11-20", ["b", "c"]],
    ]);
  });
});

describe("range choice", () => {
  const chat = (messageCount: number): ChatOverview => ({
    index: 0, title: null, formatLabel: "x", source: "whatsapp", messageCount,
    firstTime: at("2026-11-01", "09:00"), lastTime: at("2026-11-20", "09:00"), authors: [], warnings: [], timeQuality: "exact",
  });

  it("reads small chats whole and big ones from the last 3 days", () => {
    expect(defaultRange(chat(200)).kind).toBe("all");
    expect(defaultRange(chat(5000))).toMatchObject({ kind: "lastDays", days: 3, date: "2026-11-18" });
  });

  it("only produces a spec once the choice is complete", () => {
    const base = defaultRange(chat(5000));
    expect(toRangeSpec({ ...base, kind: "sinceMine" })).toBeNull();
    expect(toRangeSpec({ ...base, kind: "sinceMine", author: "Diya" })).toEqual({ kind: "sinceMine", author: "Diya" });
    expect(toRangeSpec({ ...base, kind: "lastDays", days: 999 })).toEqual({ kind: "lastDays", days: 60 });
    expect(toRangeSpec({ ...base, kind: "since", date: "" })).toBeNull();
  });
});

describe("demo catch-up", () => {
  it("is a valid catch-up whose items all cite a kept demo message", () => {
    const run = buildDemoRun(at("2026-11-20", "12:00"));
    expect(catchUpSchema.safeParse(run.catchup).success).toBe(true);
    const ids = new Set(run.quotes.map((q) => q.id));
    const cited = [run.catchup.deadlines, run.catchup.decisions, run.catchup.questions, run.catchup.polls, run.catchup.links, run.catchup.files]
      .flat()
      .flatMap((i) => i.sourceIds);
    expect(cited.every((id) => ids.has(id))).toBe(true);
  });
});
