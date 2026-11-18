// Generates a fake 50,000-message WhatsApp export and times the on-device steps in Node.
// Usage: npm run bench   (also writes scripts/out/bench-50k.txt to drop into the app)
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { parseExport } from "../src/lib/chat/registry";
import { prepareChat } from "../src/lib/client/prepare";

const COUNT = 50_000;
const NAMES = ["Aarav Mehta", "Diya Nair", "Kabir Rao", "Ishita Verma", "Rohan Pillai", "Meera Iyer", "Arjun Das", "Sana Khan", "Neha Joshi", "Varun S"];
const LINES = [
  "ok", "👍", "haha", "Lab record due Friday 10 AM in LH-2", "Notes: https://drive.google.com/file/d/abc123/view",
  "Who has the viva schedule?", "Call me on 98765 43210", "<Media omitted>", "Class moved to Seminar Hall tomorrow",
  "Mess fee due 20th, pay to warden@okaxis", "thanks", "Anyone going to the fest?", "Assignment 3 is up on the portal",
];

function fakeExport(): string {
  const out: string[] = [];
  let time = new Date(2024, 0, 1, 8, 0).getTime();
  for (let i = 0; i < COUNT; i++) {
    time += 30_000 + ((i * 7919) % 300_000);
    const d = new Date(time);
    const pad = (n: number) => String(n).padStart(2, "0");
    const name = NAMES[(i * 31) % NAMES.length];
    const line = LINES[(i * 17) % LINES.length];
    out.push(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())} - ${name}: ${line}`);
    if (i % 50 === 0) out.push("and a second line for a multi-line message");
  }
  return out.join("\n");
}

function time<T>(label: string, fn: () => T): T {
  const start = performance.now();
  const result = fn();
  console.log(`${label.padEnd(36)} ${(performance.now() - start).toFixed(0).padStart(6)} ms`);
  return result;
}

const text = fakeExport();
const outDir = join(import.meta.dirname, "out");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "bench-50k.txt"), text);
console.log(`Fake export: ${COUNT.toLocaleString()} messages, ${(text.length / 1024 / 1024).toFixed(1)} MB`);

const [chat] = time("Detect + parse (WhatsApp)", () => parseExport([{ path: "WhatsApp Chat with Bench.txt", text }]));
time("Range (last 7 days) + privacy + chunks", () => prepareChat(chat, { kind: "lastDays", days: 7 }));
time("Whole export + privacy + chunks", () => prepareChat(chat, { kind: "all" }));
console.log(`Parsed ${chat.messages.length.toLocaleString()} messages.`);
