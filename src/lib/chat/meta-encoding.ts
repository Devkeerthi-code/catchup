const utf8 = new TextDecoder("utf-8", { fatal: true });

/**
 * Meta's "Download your information" JSON writes each UTF-8 byte as its own \u00XX escape,
 * so the 4 bytes of one emoji arrive as 4 separate accented characters and Hindi or Tamil text
 * turns into mojibake. Re-reading the characters as bytes and decoding them as UTF-8 restores it.
 * Strings that are not byte-encoded (real Latin-1 like "café", or already-correct text) are kept.
 */
export function fixMetaEncoding(value: string): string {
  if (!/[\u0080-\u00ff]/.test(value)) return value;
  const bytes = new Uint8Array(value.length);
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 0xff) return value;
    bytes[i] = code;
  }
  try {
    return utf8.decode(bytes);
  } catch {
    return value;
  }
}

/** Applies the fix to every string inside a parsed JSON value. */
export function fixMetaEncodingDeep<T>(value: T): T {
  if (typeof value === "string") return fixMetaEncoding(value) as T;
  if (Array.isArray(value)) return value.map((v) => fixMetaEncodingDeep(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) out[key] = fixMetaEncodingDeep(v);
    return out as T;
  }
  return value;
}
