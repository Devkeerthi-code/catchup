import "server-only";
import { ApiError, GoogleGenAI, type Part } from "@google/genai";
import { Agent, setGlobalDispatcher } from "undici";
import { z } from "zod";
import { env } from "./env";

// Node's default 10 s connect timeout fails on slow connections (mobile hotspots, some campus
// networks) before Gemini is even reached. The per-request abort timeout still caps total time.
setGlobalDispatcher(new Agent({ connect: { timeout: 30_000 } }));

export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly status: 429 | 502 | 503 | 504,
    readonly retryAfterSeconds = 0,
  ) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

let client: GoogleGenAI | undefined;
function ai(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: env().GEMINI_API_KEY });
  return client;
}

interface JsonCallOptions<T extends z.ZodType> {
  system: string;
  parts: Part[];
  /** Loose schema sent to Gemini as JSON Schema; strict validation happens afterwards. */
  schema: T;
  maxOutputTokens: number;
  timeoutMs: number;
}

function retryAfterFrom(error: ApiError): number {
  const match = /retry in (\d+(?:\.\d+)?)s/i.exec(error.message) ?? /"retryDelay":\s*"(\d+)s"/.exec(error.message);
  return match ? Math.ceil(Number(match[1])) : 30;
}

async function callModel<T extends z.ZodType>(model: string, options: JsonCallOptions<T>): Promise<unknown> {
  const response = await ai().models.generateContent({
    model,
    contents: [{ role: "user", parts: options.parts }],
    config: {
      systemInstruction: options.system,
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(options.schema),
      temperature: 0.2,
      maxOutputTokens: options.maxOutputTokens,
      // Extraction doesn't benefit from long reasoning; a small budget keeps latency and quota down.
      thinkingConfig: { thinkingBudget: 512 },
      abortSignal: AbortSignal.timeout(options.timeoutMs),
    },
  });
  const text = response.text;
  if (!text) throw new AiUnavailableError("The AI returned an empty answer. Try again.", 502);
  try {
    return JSON.parse(text);
  } catch {
    throw new AiUnavailableError("The AI returned an unreadable answer. Try again.", 502);
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 429 || error.status >= 500;
  return error instanceof AiUnavailableError;
}

/**
 * Calls the main model, then the lighter fallback model once if the first is overloaded or out
 * of quota. Every failure becomes an AiUnavailableError with a message the UI can show as is.
 */
export async function generateJson<T extends z.ZodType>(options: JsonCallOptions<T>): Promise<unknown> {
  const { GEMINI_MODEL, GEMINI_FALLBACK_MODEL } = env();
  const models = GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== GEMINI_MODEL ? [GEMINI_MODEL, GEMINI_FALLBACK_MODEL] : [GEMINI_MODEL];
  let lastError: unknown;
  for (const model of models) {
    try {
      return await callModel(model, options);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }
  throw toAiError(lastError);
}

function toAiError(error: unknown): AiUnavailableError {
  if (error instanceof AiUnavailableError) return error;
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new AiUnavailableError("The free AI quota is used up for now.", 429, retryAfterFrom(error));
    }
    if (error.status >= 500) return new AiUnavailableError("The AI service is overloaded. Try again in a minute.", 503, 60);
    console.error("Gemini request rejected", error.status, error.message.slice(0, 300));
    return new AiUnavailableError("The AI couldn't process this part of the chat.", 502);
  }
  if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return new AiUnavailableError("The AI took too long to answer. Try a shorter range.", 504);
  }
  console.error("Gemini call failed", error instanceof Error ? error.message : error);
  return new AiUnavailableError("The AI service couldn't be reached. Check your connection and try again.", 503, 30);
}
