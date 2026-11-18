// Manual check: sends the fake Android fixture through the real prompt and prints the cleaned result.
// Usage: npx tsx scripts/smoke-gemini.ts   (needs GEMINI_API_KEY in .env)
import "dotenv/config";
import { readFileSync } from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { Agent, setGlobalDispatcher } from "undici";
import { z } from "zod";
import { parseWhatsAppText } from "../src/lib/chat/adapters/whatsapp";
import { isNoise } from "../src/lib/chat/text";
import { sanitizeMessages } from "../src/lib/privacy/pseudonymize";
import { chunkMessages, citableIds, toPayloadMessage } from "../src/lib/summary/chunk";
import { buildChunkPrompt, CHUNK_SYSTEM_INSTRUCTION } from "../src/lib/summary/prompt";
import { cleanChunkSummary, modelChunkSchema } from "../src/lib/summary/schema";

setGlobalDispatcher(new Agent({ connect: { timeout: 30_000 } }));

async function main() {
  const chat = parseWhatsAppText(readFileSync("tests/fixtures/whatsapp/android-24h-dmy.txt", "utf-8"));
  const { messages } = sanitizeMessages(chat.messages);
  const [chunk] = chunkMessages(messages.filter((m) => !isNoise(m)).map(toPayloadMessage));
  const model = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
  const started = Date.now();
  const response = await new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }).models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: buildChunkPrompt(chunk.messages, 0, 1) }] }],
    config: {
      systemInstruction: CHUNK_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(modelChunkSchema),
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 512 },
    },
  });
  const clean = cleanChunkSummary(JSON.parse(response.text ?? "{}"), citableIds(chunk));
  console.log(`${model} answered in ${Date.now() - started} ms`);
  console.log(JSON.stringify(clean, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
