import { describe, expect, it } from "vitest";
import { parseWhatsAppText } from "@/lib/chat/adapters/whatsapp";
import { maskSensitive } from "@/lib/privacy/mask";
import { buildNameReplacer, buildPseudonyms, sanitizeMessages } from "@/lib/privacy/pseudonymize";
import { chunkMessages, toPayloadMessage } from "@/lib/summary/chunk";
import { fixture, msg } from "./helpers";

describe("masking", () => {
  it.each([
    ["Call +91 98765 43210 now", "Call [phone] now"],
    ["my no 9876543210", "my no [phone]"],
    ["landline 080-2345-6789", "landline [phone]"],
    ["(+91) 98765-43210", "[phone]"],
    ["mail diya.nair@example.com today", "mail [email] today"],
    ["pay kabir@okaxis or 9876543210@ybl", "pay [upi-id] or [upi-id]"],
    ["UPI: canteen.shop@paytm.", "UPI: [upi-id]."],
  ])("masks %s", (input, expected) => {
    expect(maskSensitive(input)).toBe(expected);
  });

  it.each([
    "Exam on 12/03/2024 at 10:30",
    "Room 204, block 3",
    "Fee is ₹1,50,000 for 2024-25",
    "2024-03-12 10:30 meeting",
    "Score 98.76 out of 100",
    "Roll no 21CS045",
    "Version 1.2.3",
  ])("keeps %s unchanged", (input) => {
    expect(maskSensitive(input)).toBe(input);
  });

  it("keeps ordinary links intact (they're needed for the Links section) but masks wa.me numbers", () => {
    expect(maskSensitive("see https://x.com/user/status/1769876543210987654")).toBe("see https://x.com/user/status/1769876543210987654");
    expect(maskSensitive("chat https://wa.me/919876543210")).toBe("chat https://wa.me/[phone]");
    expect(maskSensitive("https://forms.example.com/r?email=a@b.com&x=1")).toBe("https://forms.example.com/r?email=[masked]&x=1");
  });
});

describe("pseudonyms", () => {
  it("numbers members by first appearance and stays consistent", () => {
    const messages = [msg({ author: "Diya Nair", text: "a" }), msg({ author: "Aarav Mehta", text: "b" }), msg({ author: "Diya Nair", text: "c" })];
    const map = buildPseudonyms(messages);
    expect([...map.entries()]).toEqual([["Diya Nair", "Member 1"], ["Aarav Mehta", "Member 2"]]);
  });

  it("replaces full names, first names, surnames and @mentions inside text", () => {
    const replace = buildNameReplacer(new Map([["Diya Nair", "Member 1"], ["Aarav Mehta", "Member 2"]]));
    expect(replace("Ask Diya Nair or @Aarav. diya knows, Mehta too")).toBe("Ask Member 1 or @Member 2. Member 1 knows, Member 2 too");
  });

  it("doesn't replace names inside other words", () => {
    const replace = buildNameReplacer(new Map([["Ravi", "Member 1"]]));
    expect(replace("Ravi went to Ravindra's place")).toBe("Member 1 went to Ravindra's place");
  });

  it("leaves a first name shared by two members ambiguous rather than guessing", () => {
    const replace = buildNameReplacer(new Map([["Rahul Sharma", "Member 1"], ["Rahul Verma", "Member 2"]]));
    expect(replace("Rahul Sharma and Verma, but which Rahul?")).toBe("Member 1 and Member 2, but which Rahul?");
  });

  it("handles Indian-script names", () => {
    const replace = buildNameReplacer(new Map([["प्रिया शर्मा", "Member 3"]]));
    expect(replace("प्रिया शर्मा ने कहा")).toBe("Member 3 ने कहा");
  });
});

describe("nothing identifying reaches the API payload", () => {
  const REAL = ["Aarav", "Mehta", "Diya", "Nair", "Kabir", "Rao", "Ishita", "Verma", "Rohan", "Pillai", "98765", "43210"];

  it("for a WhatsApp export full of names and numbers", () => {
    const chat = parseWhatsAppText(fixture("whatsapp/android-24h-dmy.txt").text);
    const extra = [
      msg({ author: "Kabir Rao", text: "Diya's email is diya.nair@example.com, UPI diya@oksbi, phone 98765 43210" }),
      msg({ author: "Ishita Verma", text: "@Aarav Mehta pls check", attachments: [{ kind: "document", name: "Rohan_Pillai_resume.pdf" }] }),
    ];
    const { messages } = sanitizeMessages([...chat.messages, ...extra]);
    const payload = JSON.stringify(chunkMessages(messages.map(toPayloadMessage)));
    for (const secret of REAL) expect(payload).not.toContain(secret);
    expect(payload).not.toMatch(/@example\.com|@oksbi/);
    expect(payload).toContain("Member 1");
    expect(payload).toContain("[email]");
    expect(payload).toContain("[phone]");
    expect(payload).toContain("[upi-id]");
  });

  it("masks names and numbers in polls too", () => {
    const { messages } = sanitizeMessages([
      msg({ author: "Aarav Mehta", text: "", poll: { question: "Who calls Aarav?", options: [{ text: "Diya at 9876543210", votes: 1 }] } }),
      msg({ author: "Diya Nair", text: "x" }),
    ]);
    const payload = JSON.stringify(messages.map(toPayloadMessage));
    expect(payload).not.toMatch(/Aarav|Diya|9876543210/);
  });
});
