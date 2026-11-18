import "dotenv/config";
import { defineConfig } from "prisma/config";

// Neon computes sleep when idle and slow networks add latency; 5 s (the default) is often too short.
function withConnectTimeout(url: string): string {
  if (/[?&]connect_timeout=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}connect_timeout=30`;
}

// `prisma generate` (run on install and in CI) needs no database, so the URL is optional here;
// migrate commands fail with a clear message when it's missing.
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  ...(url ? { datasource: { url: withConnectTimeout(url) } } : {}),
});
