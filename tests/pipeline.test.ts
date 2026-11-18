import { describe, expect, it } from "vitest";
import { applyRange } from "@/lib/chat/range";
import { isNoise, normalizeUrl } from "@/lib/chat/text";
import { buildIcs, escapeIcsText, foldLine } from "@/lib/ics";
import { computeInsights } from "@/lib/insights";
import { computeStats } from "@/lib/summary/assemble";
import { chunkMessages, citableIds, estimateTokens, toPayloadMessage } from "@/lib/summary/chunk";
import { collectLinks, mergeChunkSummaries } from "@/lib/summary/merge";
import { EMPTY_CHUNK_SUMMARY, type ChunkSummary } from "@/lib/summary/schema";
import type { DeadlineItem } from "@/lib/summary/types";
import { msg } from "./helpers";

const base = Date.parse("2024-03-12T10:00:00+05:30");
const at = (minutes: number) => base + minutes * 60_000;
const part = (p: Partial<ChunkSummary>): ChunkSummary => ({ ...structuredClone(EMPTY_CHUNK_SUMMARY), ...p });

describe("chunking", () => {
  const messages = Array.from({ length: 300 }, (_, i) =>
    toPayloadMessage(msg({ id: `m${i + 1}`, time: at(i), text: `Message number ${i + 1} about the lab record and the viva schedule` })),
  );

  it("keeps every chunk under the token budget and in time order", () => {
    const chunks = chunkMessages(messages, 1000);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) expect(chunk.messages.reduce((s, m) => s + estimateTokens(m), 0)).toBeLessThanOrEqual(1000 + 60);
    const own = chunks.flatMap((c) => c.messages.filter((m) => !m.c).map((m) => m.id));
    expect(own).toEqual(messages.map((m) => m.id));
  });

  it("starts each later chunk with context-only messages that can't be cited", () => {
    const [first, second] = chunkMessages(messages, 1000);
    const context = second.messages.filter((m) => m.c === 1);
    expect(context.map((m) => m.id)).toEqual(first.messages.slice(-4).map((m) => m.id));
    for (const m of context) expect(citableIds(second).has(m.id)).toBe(false);
  });

  it("puts a single oversized message in its own chunk instead of looping", () => {
    const big = toPayloadMessage(msg({ id: "m1", text: "x".repeat(1500) }));
    expect(chunkMessages([big, big], 100)).toHaveLength(2);
    expect(chunkMessages([])).toEqual([]);
  });

  it("describes attachments and polls in the payload", () => {
    const p = toPayloadMessage(msg({ id: "m9", text: "", attachments: [{ kind: "document", name: "notes.pdf" }], poll: { question: "Day?", options: [{ text: "Mon", votes: 3 }] } }));
    expect(p.x).toBe("[document: notes.pdf] [poll: Mon (3)]");
  });
});

describe("merge and deduplication", () => {
  const messages = [
    msg({ id: "m1", time: at(0), author: "Member 1", text: "Lab record submission Friday 10 AM in LH-2" }),
    msg({ id: "m2", time: at(5), author: "Member 2", text: "Notes https://drive.google.com/file/d/abc/view?usp=sharing" }),
    msg({ id: "m3", time: at(30), author: "Member 3", text: "same link https://drive.google.com/file/d/abc/view?usp=drive_link" }),
    msg({ id: "m4", time: at(60), author: "Member 1", text: "Lab record moved to Seminar Hall, same time" }),
    msg({ id: "m5", time: at(70), author: "Member 4", text: "Is the viva on Friday too?" }),
    msg({ id: "m6", time: at(71), author: "Member 2", text: "Who has the hall ticket format?" }),
    msg({ id: "m7", time: at(72), author: "Member 3", text: "I'll send it", replyTo: "m6" }),
    msg({ id: "m8", time: at(80), author: "Member 1", text: "", poll: { question: "Farewell lunch?", options: [{ text: "Canteen", votes: 6 }] } }),
  ];
  const parts = [
    part({
      decisions: [{ text: "Lab record submission is on Friday", sourceIds: ["m1"] }],
      deadlines: [{ title: "Lab record submission", date: "2024-03-15", time: "10:00", place: "LH-2", sourceIds: ["m1"] }],
      openQuestions: [{ question: "Is the viva on Friday too?", askedBy: "Member 4", sourceIds: ["m5"] }],
    }),
    part({
      decisions: [{ text: "Lab record submission is on Friday.", sourceIds: ["m1"] }],
      deadlines: [{ title: "Submit lab record", date: "2024-03-15", time: null, place: "Seminar Hall", sourceIds: ["m4"] }],
      openQuestions: [
        { question: "Is viva also on Friday?", askedBy: "Member 4", sourceIds: ["m5"] },
        { question: "Who has the hall ticket format?", askedBy: "Member 2", sourceIds: ["m6"] },
      ],
      polls: [{ question: "Farewell lunch?", options: [], result: "Canteen leads", sourceIds: ["m8"] }],
    }),
  ];
  const merged = mergeChunkSummaries(parts, messages);

  it("merges near-duplicate decisions and keeps every source", () => {
    expect(merged.decisions).toHaveLength(1);
    expect(merged.decisions[0]).toMatchObject({ id: "d1", type: "decision", sourceIds: ["m1"] });
  });

  it("merges repeated mentions of one deadline; the later venue wins and the change is listed", () => {
    expect(merged.deadlines).toHaveLength(1);
    expect(merged.deadlines[0]).toMatchObject({
      date: "2024-03-15", time: "10:00", place: "Seminar Hall", sourceIds: ["m1", "m4"], changes: ["Venue: LH-2 → Seminar Hall"],
    });
  });

  it("deduplicates links shared with different tracking parameters", () => {
    expect(merged.links).toHaveLength(1);
    expect(merged.links[0]).toMatchObject({ domain: "drive.google.com", shares: 2, sourceIds: ["m2", "m3"] });
  });

  it("drops questions someone replied to, and merges reworded duplicates", () => {
    expect(merged.questions.map((q) => q.question)).toEqual(["Is the viva on Friday too?"]);
  });

  it("joins a model-detected poll onto the real poll it describes", () => {
    expect(merged.polls).toHaveLength(1);
    expect(merged.polls[0]).toMatchObject({ question: "Farewell lunch?", result: "Canteen leads", options: [{ text: "Canteen", votes: 6 }] });
  });

  it("normalises URLs for deduplication", () => {
    expect(normalizeUrl("https://www.Example.com/a/?utm_source=x&b=2&a=1#top")).toBe("example.com/a?a=1&b=2");
    expect(normalizeUrl("https://youtu.be/dQw4w9WgXcQ?si=abc")).toBe("youtube.com/watch?v=dQw4w9WgXcQ");
    expect(collectLinks([msg({ id: "m1", text: "see (https://en.wikipedia.org/wiki/Mercury_(planet))." })])[0].url).toBe("https://en.wikipedia.org/wiki/Mercury_(planet)");
  });
});

describe(".ics export", () => {
  const deadline = (p: Partial<DeadlineItem>): DeadlineItem => ({
    id: "e1", type: "deadline", title: "Lab record", date: "2024-03-15", time: "10:00", place: "Seminar Hall, Block A",
    changes: [], sourceIds: ["m1"], at: base, ...p,
  });

  it("writes a valid calendar with CRLF line endings and escaped text", () => {
    const ics = buildIcs([deadline({})], "CSE 3rd Year", Date.UTC(2024, 2, 12, 4, 30));
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20240315T100000\r\nDTEND:20240315T110000");
    expect(ics).toContain("LOCATION:Seminar Hall\\, Block A");
    expect(ics).toContain("DTSTAMP:20240312T043000Z");
    expect(ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
  });

  it("uses all-day events when there's no time, and skips undated items", () => {
    const ics = buildIcs([deadline({ time: null, date: "2024-03-31" }), deadline({ id: "e2", date: null })], "Group");
    expect(ics).toContain("DTSTART;VALUE=DATE:20240331\r\nDTEND;VALUE=DATE:20240401");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("escapes and folds long lines without breaking characters", () => {
    expect(escapeIcsText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
    const folded = foldLine(`SUMMARY:${"नमस्ते ".repeat(20)}`);
    for (const line of folded.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(`SUMMARY:${"नमस्ते ".repeat(20)}`);
  });

  it("keeps a late-night event inside its day", () => {
    expect(buildIcs([deadline({ time: "23:30" })], "G")).toContain("DTEND:20240315T235900");
  });
});

describe("range, noise, insights and stats", () => {
  const messages = [
    msg({ id: "m1", time: Date.parse("2024-03-10T09:00:00+05:30"), author: "A", text: "old" }),
    msg({ id: "m2", time: Date.parse("2024-03-11T09:00:00+05:30"), author: "Me", text: "my message" }),
    msg({ id: "m3", time: Date.parse("2024-03-12T21:00:00+05:30"), author: "B", text: "ok" }),
    msg({ id: "m4", time: Date.parse("2024-03-12T21:30:00+05:30"), author: "B", text: "Exam https://www.example.com/x" }),
  ];

  it("filters by date, last N days and since my last message", () => {
    expect(applyRange(messages, { kind: "since", date: "2024-03-11" }).messages.map((m) => m.id)).toEqual(["m2", "m3", "m4"]);
    expect(applyRange(messages, { kind: "lastDays", days: 1 }).messages.map((m) => m.id)).toEqual(["m3", "m4"]);
    expect(applyRange(messages, { kind: "sinceMine", author: "Me" }).messages.map((m) => m.id)).toEqual(["m3", "m4"]);
    expect(applyRange(messages, { kind: "sinceMine", author: "Nobody" }).note).toMatch(/hasn't posted/);
  });

  it("recognises noise: acks, emoji-only, stickers, deleted and system messages", () => {
    for (const text of ["ok", "Okkk!!", "👍👍", "😂", "thank you sir", "This message was deleted"]) expect(isNoise(msg({ text }))).toBe(true);
    expect(isNoise(msg({ text: "", attachments: [{ kind: "sticker" }] }))).toBe(true);
    expect(isNoise(msg({ text: "", attachments: [{ kind: "document", name: "a.pdf" }] }))).toBe(false);
    expect(isNoise(msg({ text: "ok, see you at 5 in LH-2" }))).toBe(false);
    expect(isNoise(msg({ text: "joined", system: true }))).toBe(true);
  });

  it("computes busiest hours, daily volume, members and domains locally", () => {
    const insights = computeInsights(messages, "exact");
    expect(insights.hours[21]).toBe(2);
    expect(insights.days.map((d) => d.count)).toEqual([1, 1, 2]);
    expect(insights.members[0]).toEqual({ name: "B", count: 2 });
    expect(insights.domains).toEqual([{ domain: "example.com", count: 1 }]);
    expect(insights.noiseMessages).toBe(1);
  });

  it("estimates minutes saved and never goes negative", () => {
    expect(computeStats(1284, 900, 9)).toEqual({ messagesRead: 1284, noiseRemoved: 900, signalItems: 9, minutesSaved: 52 });
    expect(computeStats(3, 0, 9).minutesSaved).toBe(0);
  });
});
