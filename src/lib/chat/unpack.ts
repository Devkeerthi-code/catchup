import { unzipSync } from "fflate";
import type { SourceFile } from "./types";
import { ParseError } from "./types";

const TEXT_EXT = /\.(txt|json|csv)$/i;
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 400 * 1024 * 1024;
const decoder = new TextDecoder("utf-8");

export interface RawUpload {
  name: string;
  bytes: Uint8Array;
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function unzipTextFiles(bytes: Uint8Array): SourceFile[] {
  let total = 0;
  const entries = unzipSync(bytes, {
    // Only chat text is needed; photos and voice notes inside the zip are skipped unread.
    filter: (file) => {
      if (!TEXT_EXT.test(file.name) || file.name.includes("__MACOSX")) return false;
      total += file.originalSize;
      if (total > MAX_UNPACKED_BYTES) throw new ParseError("This zip is too large to read in the browser.");
      return true;
    },
  });
  return Object.entries(entries).map(([path, data]) => ({ path: normalizePath(path), text: decoder.decode(data) }));
}

/** Turns dropped files (txt, json, csv or zip) into text files the adapters can inspect. */
export function unpackUploads(uploads: RawUpload[]): SourceFile[] {
  const files: SourceFile[] = [];
  for (const upload of uploads) {
    if (upload.bytes.length > MAX_UPLOAD_BYTES) throw new ParseError(`${upload.name} is larger than 200 MB.`);
    if (isZip(upload.bytes)) {
      try {
        files.push(...unzipTextFiles(upload.bytes));
      } catch (error) {
        if (error instanceof ParseError) throw error;
        throw new ParseError(`${upload.name} looks like a zip but couldn't be opened. Try exporting it again.`);
      }
    } else {
      files.push({ path: normalizePath(upload.name), text: decoder.decode(upload.bytes) });
    }
  }
  return files;
}
