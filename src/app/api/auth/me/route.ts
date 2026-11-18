import { readSession } from "@/lib/server/session";

export async function GET(): Promise<Response> {
  const session = await readSession();
  return Response.json({ user: session ? { email: session.email } : null }, { headers: { "Cache-Control": "no-store" } });
}
