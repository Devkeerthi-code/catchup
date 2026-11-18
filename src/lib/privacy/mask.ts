/**
 * Masks contact details before any text leaves the browser. The server runs the same function
 * again on what it receives, so a modified client still can't send raw numbers to the model.
 */

const URL_SPAN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
// UPI ids look like emails without a dot in the handle: name@okaxis, 98xxxxxx10@ybl, shop@paytm.
// A trailing "." is allowed (end of sentence) as long as no domain part follows it.
const UPI = /(?<![\p{L}\p{N}._-])[\p{L}\p{N}._-]{2,256}@[a-z][a-z0-9]{1,63}(?![\p{L}\p{N}@-]|\.[\p{L}\p{N}])/giu;
// Digit runs with optional +country code and space/dash/dot/bracket separators.
const PHONE_CANDIDATE = /(?<![\p{L}\p{N}/:#])\(?\+?\(?\d[\d\s().-]{6,20}\d(?![\p{L}\p{N}/:])/gu;
const DATE_LIKE = /^(\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./]\d{2,4})(\s|$)/;

function looksLikePhone(candidate: string): boolean {
  const digits = candidate.replace(/\D/g, "");
  if (DATE_LIKE.test(candidate.trim())) return false;
  if (/\d[.]\d/.test(candidate) && !/\s/.test(candidate) && !candidate.startsWith("+")) return false;
  if (/^\(?\+/.test(candidate)) return digits.length >= 8 && digits.length <= 15;
  return digits.length >= 10 && digits.length <= 13;
}

function maskPlain(text: string): string {
  return text
    .replace(EMAIL, "[email]")
    .replace(UPI, "[upi-id]")
    .replace(PHONE_CANDIDATE, (match) => (looksLikePhone(match) ? "[phone]" : match));
}

/** URLs are kept intact (they are needed for Links) except wa.me / tel: links and emails in mailto. */
function maskUrl(url: string): string {
  if (/^(https?:\/\/)?(www\.)?(wa\.me|api\.whatsapp\.com)\//i.test(url)) return url.replace(/\d{6,}/g, "[phone]");
  return url.replace(EMAIL, "[email]").replace(/([?&](?:phone|mobile|tel|email)=)[^&#]+/gi, "$1[masked]");
}

export function maskSensitive(text: string): string {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(URL_SPAN)) {
    const start = match.index ?? 0;
    out += maskPlain(text.slice(last, start)) + maskUrl(match[0]);
    last = start + match[0].length;
  }
  out += maskPlain(text.slice(last));
  return out.replace(/\btel:\s*\[phone\]/gi, "[phone]");
}

/** True when text still contains something that looks like a phone, email or UPI id. */
export function containsSensitive(text: string): boolean {
  return maskSensitive(text) !== text;
}
