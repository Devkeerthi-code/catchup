// Writes the JSON/CSV test fixtures. Every person and message here is fictional.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = (...p) => join(import.meta.dirname, "..", "tests", "fixtures", ...p);
const unix = (iso) => String(Math.floor(Date.parse(iso) / 1000));
const tg = (id, iso, fields) => ({
  id,
  type: "message",
  date: iso.slice(0, 19),
  date_unixtime: unix(iso),
  text: "",
  text_entities: [],
  ...fields,
});

const telegram = {
  name: "Robotics Club 2024",
  type: "private_supergroup",
  id: 1700000001,
  messages: [
    tg(1, "2024-03-12T10:00:00+05:30", { type: "service", actor: "Neha Joshi", actor_id: "user111", action: "create_group", title: "Robotics Club 2024" }),
    tg(2, "2024-03-12T10:05:00+05:30", { from: "Neha Joshi", from_id: "user111", text: "Workshop on Saturday at 2 PM in the Innovation Lab" }),
    tg(3, "2024-03-12T10:06:00+05:30", { from: "Varun S", from_id: "user222", reply_to_message_id: 2, text: "Do we need to bring our own Arduino?" }),
    tg(4, "2024-03-12T10:07:30+05:30", {
      from: "Neha Joshi",
      from_id: "user111",
      reply_to_message_id: 3,
      text: ["Kits are provided. Register here: ", { type: "text_link", text: "form", href: "https://forms.gle/AbCdEf123" }, " before Friday"],
    }),
    tg(5, "2024-03-12T11:00:00+05:30", { from: "Pranav", from_id: "user333", forwarded_from: "IEEE Student Branch", text: "IEEE hackathon registrations close on 20 March" }),
    tg(6, "2024-03-12T11:30:00+05:30", {
      from: "Varun S",
      from_id: "user222",
      file: "(File not included. Change data exporting settings to download.)",
      media_type: "sticker",
      sticker_emoji: "👍",
      reactions: [{ type: "emoji", count: 3, emoji: "😂" }],
    }),
    tg(7, "2024-03-12T12:00:00+05:30", {
      from: "Neha Joshi",
      from_id: "user111",
      poll: {
        question: "Which day for the next meetup?",
        closed: true,
        total_voters: 9,
        answers: [
          { text: "Monday", voters: 2, chosen: false },
          { text: "Wednesday", voters: 7, chosen: true },
        ],
      },
    }),
    tg(8, "2024-03-12T12:30:00+05:30", {
      from: "Pranav",
      from_id: "user333",
      file: "files/Bot_Design_v2.pdf",
      file_name: "Bot_Design_v2.pdf",
      mime_type: "application/pdf",
      text: "Final design doc",
    }),
  ],
};
writeFileSync(dir("telegram", "result.json"), JSON.stringify(telegram, null, 1));

const author = (id, name, nickname) => ({ id, name, nickname });
const discord = {
  guild: { id: "900", name: "Campus Devs" },
  channel: { id: "901", type: "GuildTextChat", category: "General", name: "announcements" },
  messages: [
    { id: "1001", type: "GuildMemberJoin", timestamp: "2024-03-12T09:00:00.000+05:30", content: "", author: author("11", "kavya_r", "Kavya"), attachments: [], reactions: [] },
    {
      id: "1002",
      type: "Default",
      timestamp: "2024-03-12T09:05:00.000+05:30",
      content: "Standup moved to 10:30 tomorrow, same Meet link https://meet.google.com/abc-defg-hij",
      author: author("12", "dev_sid", "Siddharth"),
      attachments: [],
      reactions: [{ emoji: { id: "", name: "👍" }, count: 4 }],
    },
    {
      id: "1003",
      type: "Reply",
      timestamp: "2024-03-12T09:06:00.000+05:30",
      content: "Can we push it to 11?",
      author: author("11", "kavya_r", "Kavya"),
      attachments: [],
      reactions: [],
      reference: { messageId: "1002", channelId: "901", guildId: "900" },
    },
    {
      id: "1004",
      type: "Default",
      timestamp: "2024-03-12T09:10:00.000+05:30",
      content: "",
      author: author("13", "tanvi.k", null),
      attachments: [{ id: "a1", url: "https://cdn.example.com/attachments/sprint_plan.xlsx", fileName: "sprint_plan.xlsx", fileSizeBytes: 2000 }],
      reactions: [],
    },
  ],
};
writeFileSync(dir("discord", "announcements.json"), JSON.stringify(discord, null, 1));

writeFileSync(
  dir("discord", "announcements.csv"),
  [
    '"AuthorID","Author","Date","Content","Attachments","Reactions"',
    '"12","dev_sid","2024-03-12T09:05:00.000+05:30","Standup moved to 10:30 tomorrow","","👍 (4)"',
    '"11","kavya_r","12-Mar-24 09:06 AM","Line one, with a comma',
    'and a second line","",""',
    '"13","tanvi.k","2024-03-12T09:10:00.000+05:30","","https://cdn.example.com/attachments/sprint_plan.xlsx","❤️ (1),🔥 (2)"',
  ].join("\r\n"),
);

writeFileSync(
  dir("discord", "package-messages.csv"),
  [
    "ID,Timestamp,Contents,Attachments",
    "5001,2024-03-12 09:05:00,I'll send the slides tonight,",
    "5002,2024-03-12 09:30:00,,https://cdn.example.com/attachments/slides.pdf",
  ].join("\n"),
);

// Meta writes each UTF-8 byte of a string as its own \u00XX escape. Reproduce that exactly.
const mojibake = (s) => String.fromCharCode(...new TextEncoder().encode(s));
const metaEscape = (json) => json.replace(/[\u0080-\u00ff]/g, (c) => `\\u00${c.charCodeAt(0).toString(16).padStart(2, "0")}`);
const at = (iso) => Date.parse(iso);
const meta = {
  participants: [{ name: mojibake("Ananya Krishnan") }, { name: mojibake("Rahul Sharma") }, { name: mojibake("Zoë Fernandes") }],
  messages: [
    { sender_name: mojibake("Zoë Fernandes"), timestamp_ms: at("2024-03-12T20:10:00+05:30"), content: mojibake("Liked a message") },
    { sender_name: mojibake("Zoë Fernandes"), timestamp_ms: at("2024-03-12T20:08:00+05:30"), content: mojibake("Count me in 🙋‍♀️") },
    {
      sender_name: mojibake("Rahul Sharma"),
      timestamp_ms: at("2024-03-12T20:05:00+05:30"),
      content: mojibake("नमस्ते सब! Trip fund ₹500 each, pay by Sunday 😂🙏"),
      reactions: [
        { reaction: mojibake("❤"), actor: mojibake("Ananya Krishnan") },
        { reaction: mojibake("❤"), actor: mojibake("Zoë Fernandes") },
      ],
    },
    {
      sender_name: mojibake("Ananya Krishnan"),
      timestamp_ms: at("2024-03-12T20:00:00+05:30"),
      content: mojibake("வணக்கம்! Booking link: https://www.example.com/trip?utm_source=ig"),
      share: { link: "https://www.example.com/trip?utm_source=ig" },
    },
    {
      sender_name: mojibake("Ananya Krishnan"),
      timestamp_ms: at("2024-03-12T19:58:00+05:30"),
      photos: [{ uri: "your_instagram_activity/messages/inbox/trip_123/photos/1.jpg", creation_timestamp: 1710253680 }],
    },
  ],
  title: mojibake("Goa Trip 🌴"),
  is_still_participant: true,
  thread_path: "inbox/goatrip_123",
};
writeFileSync(dir("meta", "message_1.json"), metaEscape(JSON.stringify(meta, null, 1)));
console.log("fixtures written");
