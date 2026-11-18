import { z } from "zod";

/** The only things CatchUp counts. Counts per day, nothing about who did them. */
export const USAGE_ACTIONS = [
  "visitor",
  "import_whatsapp",
  "import_telegram",
  "import_slack",
  "import_discord",
  "import_meta",
  "import_plaintext",
  "import_screenshot",
  "catchup_created",
  "ics_downloaded",
  "catchup_saved",
  "account_created",
] as const;

export const usageActionSchema = z.enum(USAGE_ACTIONS);
export type UsageAction = z.infer<typeof usageActionSchema>;
