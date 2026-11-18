import { modelTranscriptSchema, transcriptSchema } from "@/lib/chat/adapters/screenshot";
import { SCREENSHOT_SYSTEM_INSTRUCTION } from "@/lib/summary/prompt";
import { AiUnavailableError, generateJson } from "@/lib/server/gemini";
import { isSameOrigin, jsonError, rateLimited } from "@/lib/server/http";
import { aiLimits, consume } from "@/lib/server/rate-limit";
import { track } from "@/lib/server/usage";

export const maxDuration = 60;

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Magic bytes, so a renamed file can't pass as an image. */
function sniffImage(bytes: Uint8Array): string | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/**
 * Reads chat screenshots with Gemini. The only route where raw content (the image) leaves the
 * device, so the UI asks for consent first. Images are held in memory for the call, never stored.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Requests must come from the CatchUp app.");
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGES * MAX_IMAGE_BYTES + 100_000) {
    return jsonError(413, "Those screenshots are too large. Send up to 4 images of 4 MB each.");
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "The screenshots couldn't be read.");
  }
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (!files.length) return jsonError(422, "Add at least one screenshot.");
  if (files.length > MAX_IMAGES) return jsonError(422, `Send up to ${MAX_IMAGES} screenshots at a time.`);

  const parts = [];
  for (const file of files) {
    if (file.size > MAX_IMAGE_BYTES) return jsonError(413, `${file.name} is larger than 4 MB.`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = sniffImage(bytes);
    if (!mimeType || !TYPES.has(mimeType)) return jsonError(415, `${file.name} isn't a PNG, JPEG or WebP image.`);
    parts.push({ inlineData: { mimeType, data: Buffer.from(bytes).toString("base64") } });
  }

  const limit = await consume(aiLimits(request, "screenshot"));
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds);

  try {
    const raw = await generateJson({
      system: SCREENSHOT_SYSTEM_INSTRUCTION,
      parts: [...parts, { text: "Transcribe these chat screenshots in order." }],
      schema: modelTranscriptSchema,
      maxOutputTokens: 8192,
      timeoutMs: 50_000,
    });
    const transcript = transcriptSchema.safeParse(raw);
    if (!transcript.success || !transcript.data.messages.length) {
      return jsonError(422, "No chat messages could be read from these images. Try clearer, uncropped screenshots.");
    }
    await track("import_screenshot");
    return Response.json({ transcript: transcript.data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AiUnavailableError) {
      return error.status === 429 ? rateLimited(error.retryAfterSeconds) : jsonError(error.status, error.message);
    }
    throw error;
  }
}
