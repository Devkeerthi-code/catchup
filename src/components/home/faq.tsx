"use client";

import { useState } from "react";
import { SpringCollapse } from "@/components/motion/spring-collapse";
import { Icon } from "@/components/ui/icon";

const QUESTIONS = [
  {
    q: "What exactly leaves my phone?",
    a: [
      "Only the masked text of the date range you pick. Before anything is sent, names become Member 1, Member 2, and phone numbers, emails and UPI IDs are replaced, all in your browser. Stickers, “ok”s and system lines are left out, and photos, voice notes and files are never read.",
    ],
  },
  {
    q: "Do you store my chat?",
    a: [
      "No. The export is read in your browser tab. The server passes the masked text to the summariser and keeps none of it.",
      "If you choose Save catch-up, your account keeps the summary only. The quoted source messages stay in this browser, so “Open in context” keeps working here.",
    ],
  },
  {
    q: "What about screenshots?",
    a: [
      "Screenshots are the one exception. Text inside an image can’t be masked before it’s read, so the images are sent to Google Gemini to be transcribed. CatchUp doesn’t store them, and it asks for your OK first. After that, the transcript is masked like any other chat.",
    ],
  },
  {
    q: "Can I see real names in my own catch-up?",
    a: [
      "Yes, on your screen only. The list that maps Member 4 back to a name is kept in this browser, so you can switch real names on without them being sent anywhere.",
    ],
  },
  {
    q: "Which exports work?",
    a: [
      "WhatsApp (Android and iPhone, .txt or .zip), Telegram (result.json), Slack and Discord exports (JSON or CSV), Instagram and Messenger JSON from “Download your information”, pasted text, and screenshots.",
      "A Discord data package only contains your own messages, so for a whole channel use a channel export instead.",
    ],
  },
  {
    q: "What if it gets something wrong?",
    a: [
      "Every item shows the message it came from, and “Open in context” shows the messages around it. If a date changed, you see the change, so you can check in seconds instead of trusting the summary.",
    ],
  },
];

interface FaqItemProps {
  index: number;
  q: string;
  a: string[];
  open: boolean;
  onToggle: () => void;
}

function FaqItem({ index, q, a, open, onToggle }: FaqItemProps) {
  const id = `faq-${index}`;
  return (
    <div className="accordion__item">
      <h3>
        <button className="accordion__btn" type="button" aria-expanded={open} aria-controls={id} id={`${id}-btn`} onClick={onToggle}>
          {q}
          <Icon id="u-chevron" />
        </button>
      </h3>
      <SpringCollapse open={open} id={id} className="accordion__panel" role="region" labelledBy={`${id}-btn`}>
        <div>
          {a.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </SpringCollapse>
    </div>
  );
}

export function Faq() {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const toggle = (i: number) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <section className="section shell pt-0" aria-labelledby="faq-title">
      <div className="faq">
        <div className="section-head m-0">
          <span className="eyebrow">Privacy, plainly</span>
          <h2 id="faq-title">What happens to your chat</h2>
          <p>Group chats hold other people’s phone numbers and payment IDs. CatchUp is built around that first.</p>
        </div>
        <div className="accordion">
          {QUESTIONS.map((item, i) => (
            <FaqItem key={item.q} index={i} q={item.q} a={item.a} open={open.has(i)} onToggle={() => toggle(i)} />
          ))}
        </div>
      </div>
    </section>
  );
}
