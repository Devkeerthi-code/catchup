import { describe, expect, it } from "vitest";
import { fixMetaEncoding, fixMetaEncodingDeep } from "@/lib/chat/meta-encoding";
import { ADAPTERS, detectFormat, parseExport } from "@/lib/chat/registry";
import { unpackUploads } from "@/lib/chat/unpack";
import type { SourceFile } from "@/lib/chat/types";
import { fixture, zip } from "./helpers";

const cases: [string, SourceFile[], string][] = [
  ["WhatsApp Android .txt", [fixture("whatsapp/android-24h-dmy.txt")], "whatsapp"],
  ["WhatsApp iPhone .txt", [fixture("whatsapp/iphone-12h-mdy.txt")], "whatsapp"],
  ["Telegram JSON", [fixture("telegram/result.json")], "telegram"],
  ["Discord exporter JSON", [fixture("discord/announcements.json")], "discord"],
  ["Discord exporter CSV", [fixture("discord/announcements.csv")], "discord"],
  ["Meta JSON", [fixture("meta/message_1.json")], "meta"],
  ["Pasted text", [fixture("plaintext/pasted.txt")], "plaintext"],
];

describe("format auto-detection", () => {
  it.each(cases)("%s goes to the right adapter", (_, files, expected) => {
    expect(detectFormat(files)?.adapter.id).toBe(expected);
  });

  it("detects a Slack export zip", () => {
    const archive = zip({
      "export/users.json": "[]",
      "export/general/2024-03-12.json": JSON.stringify([{ type: "message", user: "U1", text: "hi", ts: "1710219600.000200" }]),
    });
    expect(detectFormat(unpackUploads([{ name: "x.zip", bytes: archive }]))?.adapter.id).toBe("slack");
  });

  it("prefers WhatsApp over the plain-text fallback for WhatsApp text pasted in", () => {
    const pasted = { path: "pasted.txt", text: "12/03/2024, 10:00 - Aarav: hello\n12/03/2024, 10:01 - Diya: hi" };
    expect(detectFormat([pasted])?.adapter.id).toBe("whatsapp");
  });

  it("rejects JSON that no adapter understands, with a readable message", () => {
    expect(detectFormat([{ path: "data.json", text: '{"hello": "world"}' }])).toBeNull();
    expect(() => parseExport([{ path: "data.json", text: '{"hello": "world"}' }])).toThrow(/couldn't recognise/);
    expect(() => parseExport([])).toThrow(/No readable chat files/);
  });

  it("gives every adapter a unique id, and each detect() stays within 0..1", () => {
    expect(new Set(ADAPTERS.map((a) => a.id)).size).toBe(ADAPTERS.length);
    for (const [, files] of cases) for (const adapter of ADAPTERS) {
      const score = adapter.detect(files);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it("reports a broken zip clearly", () => {
    const broken = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]);
    expect(() => unpackUploads([{ name: "chat.zip", bytes: broken }])).toThrow(/couldn't be opened/);
  });
});

describe("Meta encoding fix", () => {
  const asMeta = (s: string) => String.fromCharCode(...new TextEncoder().encode(s));

  it.each(["😂🙏", "नमस्ते", "வணக்கம்", "ನಮಸ್ಕಾರ", "Zoë", "₹500", "👩‍💻 family: 👨‍👩‍👧"])("restores %s", (text) => {
    expect(fixMetaEncoding(asMeta(text))).toBe(text);
  });

  it("leaves plain ASCII and real Latin-1 text alone", () => {
    expect(fixMetaEncoding("hello")).toBe("hello");
    expect(fixMetaEncoding("café")).toBe("café");
  });

  it("leaves already-correct Unicode alone", () => {
    expect(fixMetaEncoding("नमस्ते 😂")).toBe("नमस्ते 😂");
  });

  it("fixes nested objects and arrays", () => {
    expect(fixMetaEncodingDeep({ a: [asMeta("😂")], b: { c: asMeta("Zoë"), n: 3 } })).toEqual({ a: ["😂"], b: { c: "Zoë", n: 3 } });
  });
});
