import { describe, expect, it } from "vitest";
import { parseWhatsAppText } from "@/lib/chat/adapters/whatsapp";
import { prepareChat } from "@/lib/client/prepare";
import { contextMessages } from "@/lib/client/run-catchup";
import { assembleCatchUp, fallbackTldr, sourceIdsForItemIds, tldrInput } from "@/lib/summary/assemble";
import { catchUpSchema } from "@/lib/summary/catchup-schema";
import { mergeChunkSummaries } from "@/lib/summary/merge";
import { EMPTY_CHUNK_SUMMARY } from "@/lib/summary/schema";
import { fixture } from "./helpers";

describe("assembling a catch-up", () => {
  const chat = parseWhatsAppText(fixture("whatsapp/android-24h-dmy.txt").text, "WhatsApp Chat with CSE 3rd Year - B.txt");
  const prepared = prepareChat(chat, { kind: "all" });
  const merged = mergeChunkSummaries(
    [{
      ...EMPTY_CHUNK_SUMMARY,
      highlights: [{ text: "Lab record venue changed to Seminar Hall", sourceIds: ["m15"] }],
      decisions: [{ text: "Submit printed lab records only", sourceIds: ["m6"] }],
      deadlines: [{ title: "DBMS lab record", date: "2024-03-15", time: "10:00", place: "Seminar Hall", sourceIds: ["m6", "m15"] }],
    }],
    prepared.messages,
  );
  const catchup = assembleCatchUp({
    id: "6f1d1a52-3c0b-4a51-9a39-0f9d3f2e7b11",
    chat,
    rangeMessages: prepared.messages,
    insights: prepared.insights,
    merged,
    tldr: fallbackTldr(merged),
    warnings: [],
    now: 0,
  });

  it("passes the server's save schema, so types and validation can't drift apart", () => {
    const result = catchUpSchema.safeParse(catchup);
    expect(result.success, JSON.stringify(result.error?.issues)).toBe(true);
  });

  it("contains no chat text, only summary items and ids", () => {
    const json = JSON.stringify(catchup);
    expect(json).not.toContain("Bring the printed copy");
    expect(json).not.toMatch(/Aarav|Diya|Kabir/);
  });

  it("collects links, files and polls without the model", () => {
    expect(catchup.links.map((l) => l.domain)).toEqual(["drive.google.com"]);
    expect(catchup.files.map((f) => f.name)).toEqual(["Unit3_DBMS_Notes.pdf"]);
    expect(catchup.polls[0].options).toHaveLength(2);
    expect(catchup.stats.messagesRead).toBe(chat.messages.length);
    expect(catchup.title).toBe("CSE 3rd Year - B");
  });

  it("maps TL;DR item ids back to message ids", () => {
    const ids = tldrInput(merged).map((i) => i.id);
    expect(ids).toContain("h1");
    expect(sourceIdsForItemIds(["h1", "e1", "zz9"], merged)).toEqual(["m15", "m6"]);
  });

  it("keeps cited messages plus neighbours for 'open in context'", () => {
    const kept = contextMessages(catchup, prepared.messages, 1).map((m) => m.id);
    expect(kept).toEqual(expect.arrayContaining(["m5", "m6", "m7", "m14", "m15", "m16"]));
    expect(kept.length).toBeLessThan(prepared.messages.length);
  });

  it("flags a range too big for one run on the free quota", () => {
    expect(prepared.tooLarge).toBeNull();
    expect(prepared.chunks).toHaveLength(1);
  });
});
