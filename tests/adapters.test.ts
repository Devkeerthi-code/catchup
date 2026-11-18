import { describe, expect, it } from "vitest";
import { discordAdapter, parseDiscordDate } from "@/lib/chat/adapters/discord";
import { metaAdapter } from "@/lib/chat/adapters/meta";
import { parsePlainText } from "@/lib/chat/adapters/plaintext";
import { chatFromTranscript } from "@/lib/chat/adapters/screenshot";
import { decodeSlackText, slackAdapter } from "@/lib/chat/adapters/slack";
import { telegramAdapter } from "@/lib/chat/adapters/telegram";
import { unpackUploads } from "@/lib/chat/unpack";
import { fixture, localTime, zip } from "./helpers";

describe("Telegram Desktop JSON", () => {
  const [chat] = telegramAdapter.parse([fixture("telegram/result.json")]);
  const find = (t: string) => chat.messages.find((m) => m.text.includes(t))!;

  it("reads the group name, service messages and unix times", () => {
    expect(chat.title).toBe("Robotics Club 2024");
    expect(chat.messages[0]).toMatchObject({ system: true, author: null, text: 'Neha Joshi create group "Robotics Club 2024"' });
    expect(localTime(find("Workshop"))).toBe("2024-03-12 10:05");
  });

  it("links replies to the new message ids", () => {
    const question = find("bring our own Arduino");
    expect(question.replyTo).toBe(find("Workshop").id);
    expect(find("Kits are provided").replyTo).toBe(question.id);
  });

  it("flattens rich text and keeps hidden link targets", () => {
    expect(find("Kits are provided").text).toBe("Kits are provided. Register here: form (https://forms.gle/AbCdEf123) before Friday");
  });

  it("flags forwarded messages, stickers, reactions, polls and files", () => {
    expect(find("hackathon").forwarded).toBe(true);
    const sticker = chat.messages.find((m) => m.attachments[0]?.kind === "sticker")!;
    expect(sticker.attachments[0].omitted).toBe(true);
    expect(sticker.reactions).toEqual([{ emoji: "😂", count: 3 }]);
    const poll = chat.messages.find((m) => m.poll)!;
    expect(poll.poll).toEqual({
      question: "Which day for the next meetup?",
      closed: true,
      options: [{ text: "Monday", votes: 2 }, { text: "Wednesday", votes: 7 }],
    });
    expect(find("Final design doc").attachments).toEqual([{ kind: "document", name: "Bot_Design_v2.pdf" }]);
  });

  it("reads every chat from a full-account export", () => {
    const one = JSON.parse(fixture("telegram/result.json").text);
    const full = { about: "export", chats: { list: [one, { ...one, name: "Second" }] } };
    const chats = telegramAdapter.parse([{ path: "result.json", text: JSON.stringify(full) }]);
    expect(chats.map((c) => c.title)).toEqual(["Robotics Club 2024", "Second"]);
  });
});

describe("Slack export", () => {
  const users = [
    { id: "U01", name: "meghana", real_name: "Meghana Reddy", profile: { display_name: "Meghana", real_name: "Meghana Reddy" } },
    { id: "U02", name: "farhan", profile: { display_name: "", real_name: "Farhan Ali" } },
  ];
  const day = [
    { type: "message", subtype: "channel_join", user: "U02", text: "<@U02> has joined the channel", ts: "1710216000.000100" },
    { type: "message", user: "U01", text: "Release is Thursday. Checklist: <https://docs.example.com/release|release doc> &amp; <#C01|general>", ts: "1710219600.000200", reactions: [{ name: "+1", count: 2, users: ["U02"] }] },
    { type: "message", user: "U02", text: "<@U01> who signs off QA?", ts: "1710219700.000300", thread_ts: "1710219600.000200" },
    { type: "message", user: "U01", text: "", ts: "1710219800.000400", files: [{ name: "qa_plan.pdf", mimetype: "application/pdf" }] },
  ];
  const archive = zip({
    "Campus Slack export/users.json": JSON.stringify(users),
    "Campus Slack export/channels.json": JSON.stringify([{ id: "C01", name: "general" }]),
    "Campus Slack export/general/2024-03-12.json": JSON.stringify(day),
    "Campus Slack export/random/2024-03-12.json": JSON.stringify([{ type: "message", user: "U02", text: "lunch?", ts: "1710219900.000100" }]),
  });
  const files = unpackUploads([{ name: "slack.zip", bytes: archive }]);
  const chats = slackAdapter.parse(files);
  const general = chats.find((c) => c.title === "#general")!;

  it("splits channels into separate chats, busiest first", () => {
    expect(chats.map((c) => c.title)).toEqual(["#general", "#random"]);
  });

  it("resolves users, links, channels and entities", () => {
    expect(general.messages[1].author).toBe("Meghana");
    expect(general.messages[1].text).toBe("Release is Thursday. Checklist: release doc (https://docs.example.com/release) & #general");
    expect(general.messages[2].text).toBe("@Meghana who signs off QA?");
    expect(general.messages[2].author).toBe("Farhan Ali");
  });

  it("puts thread replies under their parent and maps reaction names to emoji", () => {
    expect(general.messages[2].replyTo).toBe(general.messages[1].id);
    expect(general.messages[1].reactions).toEqual([{ emoji: "👍", count: 2 }]);
  });

  it("marks joins as system and reads shared files", () => {
    expect(general.messages[0].system).toBe(true);
    expect(general.messages[3].attachments).toEqual([{ kind: "document", name: "qa_plan.pdf" }]);
  });

  it("still works without users.json, and says so", () => {
    const [chat] = slackAdapter.parse([{ path: "general/2024-03-12.json", text: JSON.stringify(day) }]);
    expect(chat.messages[1].author).toBe("U01");
    expect(chat.warnings[0]).toMatch(/users\.json/);
    expect(decodeSlackText("<@U09|sam> hi", new Map())).toBe("@sam hi");
  });
});

describe("Discord exports", () => {
  it("reads DiscordChatExporter JSON with nicknames, replies, reactions and attachments", () => {
    const [chat] = discordAdapter.parse([fixture("discord/announcements.json")]);
    expect(chat.title).toBe("Campus Devs · #announcements");
    expect(chat.messages[0].system).toBe(true);
    expect(chat.messages[1]).toMatchObject({ author: "Siddharth", reactions: [{ emoji: "👍", count: 4 }] });
    expect(chat.messages[2].replyTo).toBe(chat.messages[1].id);
    expect(chat.messages[3]).toMatchObject({ author: "tanvi.k", attachments: [{ kind: "document", name: "sprint_plan.xlsx" }] });
  });

  it("reads exporter CSV with quoted commas, line breaks and old date formats", () => {
    const [chat] = discordAdapter.parse([fixture("discord/announcements.csv")]);
    expect(chat.messages).toHaveLength(3);
    expect(chat.messages[1].text).toBe("Line one, with a comma\nand a second line");
    expect(localTime(chat.messages[1])).toBe("2024-03-12 09:06");
    expect(chat.messages[2].reactions).toEqual([{ emoji: "❤️", count: 1 }, { emoji: "🔥", count: 2 }]);
  });

  it("reads the data-package CSV and warns that only your messages are in it", () => {
    const files = [
      { path: "messages/c901/messages.csv", text: fixture("discord/package-messages.csv").text },
      { path: "messages/c901/channel.json", text: JSON.stringify({ id: "901", name: "project-chat" }) },
    ];
    expect(discordAdapter.detect(files)).toBeGreaterThan(0.8);
    const [chat] = discordAdapter.parse(files);
    expect(chat.title).toBe("project-chat");
    expect(chat.messages.every((m) => m.author === "You")).toBe(true);
    expect(chat.messages[1].attachments[0].name).toBe("slides.pdf");
    expect(chat.warnings[0]).toMatch(/only includes messages you sent/);
  });

  it("parses both date styles", () => {
    expect(parseDiscordDate("12-Mar-24 12:30 AM")).toBe(new Date(2024, 2, 12, 0, 30).getTime());
    expect(Number.isNaN(parseDiscordDate("not a date"))).toBe(true);
  });
});

describe("Instagram / Messenger (Meta) JSON", () => {
  const file = { path: "your_instagram_activity/messages/inbox/goatrip_123/message_1.json", text: fixture("meta/message_1.json").text };
  const [chat] = metaAdapter.parse([file]);

  it("fixes Meta's byte-escaped text so emoji and Indian scripts come out right", () => {
    expect(chat.title).toBe("Goa Trip 🌴");
    expect(chat.messages.map((m) => m.author)).toContain("Zoë Fernandes");
    expect(chat.messages.find((m) => m.author === "Rahul Sharma")!.text).toBe("नमस्ते सब! Trip fund ₹500 each, pay by Sunday 😂🙏");
    expect(chat.messages.find((m) => m.text.startsWith("வணக்கம்"))).toBeDefined();
  });

  it("puts newest-first messages in time order and labels Instagram from the path", () => {
    expect(chat.formatLabel).toBe("Instagram · Download your information · JSON");
    expect(chat.messages[0].attachments[0].kind).toBe("image");
    const times = chat.messages.map((m) => m.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("groups reactions, keeps shared links once and marks 'Liked a message' as system", () => {
    expect(chat.messages.find((m) => m.author === "Rahul Sharma")!.reactions).toEqual([{ emoji: "❤", count: 2 }]);
    expect(chat.messages.find((m) => m.text.includes("Booking link"))!.text.match(/https:/g)).toHaveLength(1);
    expect(chat.messages[chat.messages.length - 1].system).toBe(true);
  });

  it("joins message_1.json and message_2.json of one thread", () => {
    const page2 = JSON.stringify({ participants: [{ name: "A" }], messages: [{ sender_name: "A", timestamp_ms: 1710000000000, content: "older" }], title: "Goa Trip" });
    const chats = metaAdapter.parse([file, { path: "your_instagram_activity/messages/inbox/goatrip_123/message_2.json", text: page2 }]);
    expect(chats).toHaveLength(1);
    expect(chats[0].messages[0].text).toBe("older");
  });

  it("reads the newer end-to-end encrypted Messenger export", () => {
    const e2ee = { participants: ["Asha", "Vikram"], threadName: "Flatmates", messages: [{ isUnsent: false, media: [], reactions: [], senderName: "Asha", text: "Rent due on 5th", timestamp: 1710000000000, type: "text" }] };
    const [flat] = metaAdapter.parse([{ path: "messages/e2ee_cutover/flatmates.json", text: JSON.stringify(e2ee) }]);
    expect(flat).toMatchObject({ title: "Flatmates", formatLabel: "Messenger · Download your information · JSON" });
    expect(flat.messages[0]).toMatchObject({ author: "Asha", text: "Rent due on 5th" });
  });
});

describe("Pasted text and screenshots", () => {
  const now = new Date(2024, 2, 12, 23, 0).getTime();

  it("reads '[time] Name: text' lines, joining continuation lines", () => {
    const chat = parsePlainText(fixture("plaintext/pasted.txt").text, now);
    expect(chat.messages.map((m) => m.author)).toEqual(["Neha Joshi", "Varun S", "Neha Joshi", "Pranav"]);
    expect(chat.messages[2].text).toBe("Also bring your laptops\ncontinue on new line");
    expect(localTime(chat.messages[0])).toBe("2024-03-12 21:41");
    expect(chat.timeQuality).toBe("estimated");
  });

  it("steps back a day when the clock wraps past midnight", () => {
    const chat = parsePlainText("Asha (11:50 PM): late\nRavi (12:05 AM): early", now);
    expect(chat.messages.map(localTime)).toEqual(["2024-03-11 23:50", "2024-03-12 00:05"]);
  });

  it("falls back to one message per line when there are no names", () => {
    const chat = parsePlainText("exam on monday\nbring hall ticket", now);
    expect(chat.messages.map((m) => m.author)).toEqual([null, null]);
    expect(chat.warnings[0]).toMatch(/no times/);
  });

  it("turns a screenshot transcript into messages in reading order", () => {
    const chat = chatFromTranscript(
      { messages: [
        { author: "Asha", date: null, time: "21:40", text: "Fest volunteers meet at 6", system: false },
        { author: "Ravi", date: null, time: "21:39", text: "ok", system: false },
      ] },
      now,
    );
    expect(chat.messages.map((m) => m.text)).toEqual(["Fest volunteers meet at 6", "ok"]);
    expect(chat.source).toBe("screenshot");
  });
});
