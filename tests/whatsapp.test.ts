import { describe, expect, it } from "vitest";
import { parseWhatsAppText, whatsappAdapter } from "@/lib/chat/adapters/whatsapp";
import { unpackUploads } from "@/lib/chat/unpack";
import { fixture, localTime, zip } from "./helpers";

describe("WhatsApp adapter: Android, 24-hour, DD/MM", () => {
  const chat = parseWhatsAppText(fixture("whatsapp/android-24h-dmy.txt").text, "WhatsApp Chat with CSE 3rd Year - B.txt");
  const byText = (t: string) => chat.messages.find((m) => m.text.includes(t));

  it("labels the detected format and takes the title from the file name", () => {
    expect(chat.formatLabel).toBe("WhatsApp · Android · 24-hour · DD/MM");
    expect(chat.title).toBe("CSE 3rd Year - B");
    expect(chat.warnings).toEqual([]);
  });

  it("reads DD/MM dates as day first", () => {
    expect(localTime(byText("DBMS lab record")!)).toBe("2024-03-12 10:40");
    expect(localTime(byText("farewell lunch")!)).toBe("2024-03-14 08:00");
  });

  it("joins multi-line messages", () => {
    expect(byText("DBMS lab record")!.text).toBe(
      "DBMS lab record submission is on Friday 15/03, 10 AM in LH-2.\nBring the printed copy, soft copy won't be accepted.",
    );
  });

  it("marks encryption notices, group creation, adds and leaves as system messages", () => {
    const system = chat.messages.filter((m) => m.system).map((m) => m.text);
    expect(system).toHaveLength(4);
    expect(system[0]).toMatch(/end-to-end encrypted/);
    expect(system).toContain("Diya Nair left");
    expect(chat.messages.filter((m) => m.system).every((m) => m.author === null)).toBe(true);
  });

  it("turns <Media omitted> into an omitted attachment and keeps attached file names", () => {
    const media = chat.messages.find((m) => m.attachments.some((a) => a.omitted));
    expect(media?.text).toBe("");
    expect(media?.author).toBe("Kabir Rao");
    const file = chat.messages.find((m) => m.attachments.some((a) => a.name === "Unit3_DBMS_Notes.pdf"));
    expect(file?.attachments[0].kind).toBe("document");
  });

  it("parses polls with vote counts", () => {
    const poll = chat.messages.find((m) => m.poll);
    expect(poll?.poll).toEqual({
      question: "Where should we have the farewell lunch?",
      options: [
        { text: "Canteen", votes: 6 },
        { text: "Hotel Saravana", votes: 11 },
      ],
    });
  });

  it("strips the edited marker", () => {
    expect(byText("Seminar Hall")!.text).toBe("Update: lab record submission moved to Seminar Hall, same time");
  });

  it("assigns ids in time order", () => {
    expect(chat.messages.map((m) => m.id).slice(0, 3)).toEqual(["m1", "m2", "m3"]);
    const times = chat.messages.map((m) => m.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });
});

describe("WhatsApp adapter: iPhone, 12-hour, MM/DD", () => {
  const chat = parseWhatsAppText(fixture("whatsapp/iphone-12h-mdy.txt").text, "_chat.txt");

  it("detects iPhone brackets, 12-hour clock and month-first dates", () => {
    expect(chat.formatLabel).toBe("WhatsApp · iPhone · 12-hour · MM/DD");
  });

  it("treats lines the group name posts with a direction mark as system messages", () => {
    const first = chat.messages[0];
    expect(first.system).toBe(true);
    expect(first.author).toBeNull();
    expect(first.text.startsWith("Messages and calls")).toBe(true);
  });

  it("converts 12-hour times, including 12 AM and 12 PM", () => {
    const water = chat.messages.find((m) => m.text.startsWith("Water supply"))!;
    expect(localTime(water)).toBe("2024-03-12 21:06");
    const key = chat.messages.find((m) => m.text.startsWith("Who has"))!;
    expect(localTime(key)).toBe("2024-03-13 12:00");
    const midnight = chat.messages.find((m) => m.text.startsWith("key is with me"))!;
    expect(localTime(midnight)).toBe("2024-03-14 00:10");
  });

  it("reads 'image omitted' and <attached: ...> files, removing the export's number prefix", () => {
    expect(chat.messages.find((m) => m.attachments[0]?.kind === "image")?.attachments[0].omitted).toBe(true);
    const pdf = chat.messages.find((m) => m.attachments[0]?.name === "Mess_Fee_Circular.pdf");
    expect(pdf?.author).toBe("Sana Khan");
    expect(pdf?.text).toBe("");
  });

  it("keeps multi-line messages together and has no direction marks left in text", () => {
    expect(chat.messages.find((m) => m.text.startsWith("Who has"))!.text).toBe("Who has the common room key?\nAlso the wifi password");
    expect(chat.messages.every((m) => !/[\u200e\u200f]/.test(m.text + (m.author ?? "")))).toBe(true);
  });
});

describe("WhatsApp adapter: edge cases", () => {
  it("assumes DD/MM and warns when every date fits both orders", () => {
    const chat = parseWhatsAppText(fixture("whatsapp/ambiguous-dates.txt").text);
    expect(chat.formatLabel).toContain("DD/MM");
    expect(chat.warnings[0]).toMatch(/assumed DD\/MM/);
    expect(localTime(chat.messages[2])).toBe("2024-02-02 09:00");
  });

  it("uses time order to pick MM/DD when that is the only order that moves forward", () => {
    const text = ["01/12/2024, 10:00 - A: one", "01/13/2024, 10:00 - A: two"].join("\n");
    // 13 can't be a month, so this is certain.
    expect(parseWhatsAppText(text).formatLabel).toContain("MM/DD");
    const forward = ["02/01/2024, 10:00 - A: one", "03/01/2024, 10:00 - A: two", "04/01/2024, 10:00 - A: three", "02/02/2024, 10:00 - A: four"].join("\n");
    // As DD/MM this is 2 Jan, 3 Jan, 4 Jan, 2 Feb (forward). As MM/DD it jumps back. DD/MM wins.
    expect(parseWhatsAppText(forward).formatLabel).toContain("DD/MM");
  });

  it("handles a narrow no-break space before am/pm and dotted a.m./p.m.", () => {
    const text = ["12/03/24, 9:45\u202fpm - Aarav: night", "13/03/24, 7:05 a.m. - Aarav: morning"].join("\n");
    const chat = parseWhatsAppText(text);
    expect(chat.messages.map(localTime)).toEqual(["2024-03-12 21:45", "2024-03-13 07:05"]);
  });

  it("does not treat 'Name: I left early' as a system message", () => {
    const chat = parseWhatsAppText("12/03/2024, 10:00 - Rohan Pillai: I left early, who has notes?");
    expect(chat.messages[0].system).toBe(false);
    expect(chat.messages[0].author).toBe("Rohan Pillai");
  });

  it("reads YYYY-MM-DD dates", () => {
    const chat = parseWhatsAppText("2024-03-12 10:00 - Aarav: hi");
    expect(chat.formatLabel).toContain("YYYY-MM-DD");
    expect(localTime(chat.messages[0])).toBe("2024-03-12 10:00");
  });

  it("throws a readable error for text that isn't an export", () => {
    expect(() => parseWhatsAppText("just some notes\nnothing here")).toThrow(/doesn't look like a WhatsApp export/);
  });

  it("reads the chat out of a .zip and skips the media inside it", () => {
    const archive = zip({
      "_chat.txt": fixture("whatsapp/iphone-12h-mdy.txt").text,
      "00000012-PHOTO-2024-03-12.jpg": new Uint8Array([0xff, 0xd8, 0xff]),
    });
    const files = unpackUploads([{ name: "WhatsApp Chat - Hostel Block C.zip", bytes: archive }]);
    expect(files.map((f) => f.path)).toEqual(["_chat.txt"]);
    expect(whatsappAdapter.detect(files)).toBeGreaterThan(0.9);
    expect(whatsappAdapter.parse(files)[0].messages.length).toBeGreaterThan(5);
  });
});
