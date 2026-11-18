import "server-only";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  // bcrypt only uses the first 72 bytes, so longer passwords would be silently truncated.
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .refine((p) => new TextEncoder().encode(p).length <= 72, "Use at most 72 characters."),
});

const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

// Compared against when the email doesn't exist, so the response time doesn't reveal accounts.
const DUMMY_HASH = "$2b$12$TR6tlM68GmjFtcWUeTu1ZuiATTKOIpV4FBNI8P5/Sdknp2Uo/zAoW";

export function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  return bcrypt.compare(password, hash ?? DUMMY_HASH);
}
