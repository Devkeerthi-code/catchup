/* On-device pseudonymisation + format detection. Pure functions: these move as-is into the Next.js worker. */
(function () {
  const LINE_WA_ANDROID = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}):(\d{2})(\s?[ap]\.?m\.?)?\s-\s([^:]+):\s?(.*)$/i;
  const LINE_WA_IOS = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s(\d{1,2}):(\d{2}):\d{2}(\s?[AP]M)?\]\s([^:]+):\s?(.*)$/i;
  const LINE_SIMPLE = /^([A-Za-z][\w .'-]{0,40}):\s(.+)$/;

  const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
  const UPI = /\b[\w.-]{2,}@(?:ok\w+|ybl|ibl|axl|paytm|upi|apl|yapl|fbl|jupiteraxis)\b/gi;
  const PHONE = /(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g;

  function detectFormat(text) {
    const head = text.trim().slice(0, 4000);
    if (!head) return null;
    if (head.startsWith("{") || head.startsWith("[")) {
      if (/"messages"\s*:/.test(head) && /"from"\s*:/.test(head)) return "Telegram (JSON)";
      if (/"author"\s*:/.test(head)) return "Discord (JSON)";
      if (/"ts"\s*:\s*"\d+\.\d+"/.test(head)) return "Slack (JSON)";
      if (/"sender_name"\s*:/.test(head)) return "Instagram / Messenger (JSON)";
      return "JSON (unknown app)";
    }
    const lines = head.split(/\r?\n/).filter(Boolean).slice(0, 30);
    const ios = lines.filter((l) => LINE_WA_IOS.test(l)).length;
    const android = lines.filter((l) => LINE_WA_ANDROID.test(l));
    if (ios >= 2) return `WhatsApp (iPhone, ${/[AP]M\]/i.test(head) ? "12h" : "24h"}, ${guessDayFirst(lines, LINE_WA_IOS)})`;
    if (android.length >= 2) return `WhatsApp (Android, ${/\d\s?[ap]\.?m/i.test(head) ? "12h" : "24h"}, ${guessDayFirst(lines, LINE_WA_ANDROID)})`;
    if (lines.filter((l) => LINE_SIMPLE.test(l)).length >= 2) return "Pasted text (Name: message)";
    return null;
  }

  // If any first field is > 12 it must be a day; default to DD/MM, the Indian setting.
  function guessDayFirst(lines, re) {
    for (const l of lines) {
      const m = l.match(re);
      if (!m) continue;
      if (Number(m[2]) > 12) return "MM/DD";
      if (Number(m[1]) > 12) return "DD/MM";
    }
    return "DD/MM";
  }

  function maskPhone() {
    return "[phone]";
  }

  /* Returns [{who, original, masked, hits}] so the UI can show exactly what changed. */
  function pseudonymise(text) {
    const names = new Map();
    const member = (name) => {
      const key = name.trim();
      if (!names.has(key)) names.set(key, `Member ${names.size + 1}`);
      return names.get(key);
    };
    const out = [];
    text.split(/\r?\n/).forEach((line) => {
      if (!line.trim()) return;
      const m = line.match(LINE_WA_ANDROID) || line.match(LINE_WA_IOS);
      let who = "";
      let body = line;
      if (m) { who = m[7]; body = m[8]; }
      else {
        const s = line.match(LINE_SIMPLE);
        if (s) { who = s[1]; body = s[2]; }
      }
      let hits = 0;
      const tag = (label) => { hits++; return `\u0000${label}\u0001`; };
      let masked = body
        .replace(UPI, () => tag("UPI ID"))
        .replace(EMAIL, () => tag("email"))
        .replace(PHONE, () => tag(maskPhone()));
      names.forEach((alias, real) => {
        const first = real.split(" ")[0];
        if (first.length > 2) masked = masked.replace(new RegExp(`\\b${escapeRe(first)}\\b`, "g"), () => tag(alias));
      });
      out.push({ who: who ? member(who) : "", realWho: who, original: body, masked, hits });
    });
    return { lines: out, members: names.size };
  }

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  window.Mask = { detectFormat, pseudonymise };
})();
