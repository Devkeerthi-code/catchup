import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// A fixed zone keeps wall-clock exports (WhatsApp) deterministic on every machine.
process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
