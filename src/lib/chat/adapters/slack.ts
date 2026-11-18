import { finalizeMessages, isRecord, parentDir, parseJsonSafe, str, type DraftMessage } from "../finalize";
import { attachmentKindFromMime } from "../text";
import type { ChatAdapter, ParsedChat, SourceFile } from "../types";
import { ParseError } from "../types";

const DAY_FILE = /(^|\/)\d{4}-\d{2}-\d{2}\.json$/;
const SYSTEM_SUBTYPES = new Set([
  "channel_join", "channel_leave", "channel_topic", "channel_purpose", "channel_name",
  "channel_archive", "channel_unarchive", "group_join", "group_leave", "bot_add", "bot_remove",
  "pinned_item", "unpinned_item", "tombstone",
]);
const EMOJI: Record<string, string> = {
  "+1": "👍", thumbsup: "👍", "-1": "👎", heart: "❤️", joy: "😂", white_check_mark: "✅",
  heavy_check_mark: "✔️", eyes: "👀", fire: "🔥", pray: "🙏", tada: "🎉", raised_hands: "🙌",
  "100": "💯", clap: "👏", smile: "😄", rocket: "🚀", ok_hand: "👌", thinking_face: "🤔",
};

type UserNames = Map<string, string>;

function readUsers(files: SourceFile[]): UserNames {
  const names: UserNames = new Map();
  const usersFile = files.find((f) => /(^|\/)(users|org_users)\.json$/.test(f.path));
  const users = usersFile ? parseJsonSafe(usersFile.text) : undefined;
  if (!Array.isArray(users)) return names;
  for (const user of users.filter(isRecord)) {
    const profile = isRecord(user.profile) ? user.profile : {};
    const name = str(profile.display_name) || str(profile.real_name) || str(user.real_name) || str(user.name);
    if (name) names.set(str(user.id), name);
  }
  return names;
}

/** Turns Slack's mrkdwn (<@U1>, <#C1|general>, <url|label>, &amp;) into plain text. */
export function decodeSlackText(text: string, users: UserNames): string {
  return text
    .replace(/<@([UW][A-Z0-9]+)(?:\|([^>]+))?>/g, (_, id: string, label?: string) => `@${users.get(id) ?? label ?? "someone"}`)
    .replace(/<#[A-Z0-9]+\|([^>]*)>/g, (_, name: string) => `#${name}`)
    .replace(/<!(here|channel|everyone)(?:\|[^>]*)?>/g, (_, who: string) => `@${who}`)
    .replace(/<mailto:([^|>]+)(?:\|[^>]+)?>/g, (_, email: string) => email)
    .replace(/<((?:https?|ftp):\/\/[^|>]+)\|([^>]+)>/g, (_, url: string, label: string) => (label === url ? url : `${label} (${url})`))
    .replace(/<((?:https?|ftp):\/\/[^>]+)>/g, (_, url: string) => url)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function toDraft(msg: Record<string, unknown>, users: UserNames): DraftMessage {
  const ts = str(msg.ts);
  const threadTs = str(msg.thread_ts);
  const subtype = str(msg.subtype);
  const profile = isRecord(msg.user_profile) ? msg.user_profile : {};
  const bot = isRecord(msg.bot_profile) ? msg.bot_profile : {};
  const author =
    users.get(str(msg.user)) || str(profile.display_name) || str(profile.real_name) ||
    str(msg.username) || str(bot.name) || str(msg.user) || null;
  const files = Array.isArray(msg.files) ? msg.files.filter(isRecord) : [];
  const reactions = Array.isArray(msg.reactions) ? msg.reactions.filter(isRecord) : [];
  return {
    key: ts,
    replyToKey: threadTs && threadTs !== ts ? threadTs : null,
    time: Number(ts) * 1000,
    author: SYSTEM_SUBTYPES.has(subtype) ? null : author,
    text: decodeSlackText(str(msg.text), users),
    attachments: files.map((f) => ({
      kind: attachmentKindFromMime(str(f.mimetype) || undefined, str(f.name)),
      name: str(f.name) || str(f.title) || undefined,
    })),
    reactions: reactions.map((r) => ({
      emoji: EMOJI[str(r.name)] ?? `:${str(r.name)}:`,
      count: typeof r.count === "number" ? r.count : 1,
    })),
    system: SYSTEM_SUBTYPES.has(subtype),
  };
}

export const slackAdapter: ChatAdapter = {
  id: "slack",
  label: "Slack",
  detect(files) {
    const dayFiles = files.filter((f) => DAY_FILE.test(f.path));
    if (!dayFiles.length) return 0;
    const hasIndex = files.some((f) => /(^|\/)(users|channels)\.json$/.test(f.path));
    const sample = dayFiles[0].text.slice(0, 3000);
    const looksLikeSlack = /"ts"\s*:\s*"\d+\.\d+"/.test(sample);
    if (!looksLikeSlack) return 0;
    return hasIndex ? 0.97 : 0.85;
  },
  parse(files) {
    const users = readUsers(files);
    const byChannel = new Map<string, DraftMessage[]>();
    for (const file of files.filter((f) => DAY_FILE.test(f.path))) {
      const day = parseJsonSafe(file.text);
      if (!Array.isArray(day)) continue;
      const channel = parentDir(file.path) || "channel";
      const drafts = byChannel.get(channel) ?? [];
      for (const msg of day.filter(isRecord)) {
        if (msg.type === "message" && str(msg.ts)) drafts.push(toDraft(msg, users));
      }
      byChannel.set(channel, drafts);
    }
    if (!byChannel.size) throw new ParseError("No Slack channel messages were found in this export.");
    const chats: ParsedChat[] = [...byChannel.entries()].map(([channel, drafts]) => ({
      source: "slack",
      formatLabel: "Slack export · JSON",
      title: `#${channel}`,
      messages: finalizeMessages(drafts),
      timeQuality: "exact",
      warnings: users.size ? [] : ["users.json was missing, so some people show as Slack user ids."],
    }));
    return chats.sort((a, b) => b.messages.length - a.messages.length);
  },
};
