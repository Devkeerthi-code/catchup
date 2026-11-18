/* Home: hero collapse (noise -> signal), masking loop, heat strip, poll bars, stat counters. */
(function () {
  const { animate, prefersReduced } = window.Physics;
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");

  // Fictional demo chat. type = null means noise.
  const DEMO = [
    { who: "Member 2", text: "good morning", type: null },
    { who: "Member 4", text: "DBMS lab record moved to tomorrow 9 AM, Lab 3", type: ["i-deadline", "Deadline"] },
    { who: "Member 9", text: "[sticker]", type: null },
    { who: "Member 5", text: "what?? it was monday", type: null },
    { who: "Member 2", text: "ok", type: null },
    { who: "Member 1", text: "Final: industrial visit is 3 Dec, not 28 Nov", type: ["i-decision", "Decision"] },
    { who: "Member 11", text: "haha", type: null },
    { who: "Member 6", text: "[voice note 0:41]", type: null },
    { who: "Member 9", text: "OS unit 4 notes drive.google.com/…", type: ["i-link", "Link"] },
    { who: "Member 3", text: "+1", type: null },
    { who: "Member 8", text: "forwarded many times", type: null },
    { who: "Member 7", text: "Poll: extra class on Saturday? 18 yes, 11 no", type: ["i-poll", "Poll"] },
    { who: "Member 5", text: "who all are coming canteen", type: null },
    { who: "Member 2", text: "[image omitted]", type: null },
    { who: "Member 4", text: "<DBMS_lab_manual_v2.pdf> use this one, not v1", type: ["i-file", "File"] },
    { who: "Member 11", text: "send pls", type: null },
    { who: "Member 7", text: "Hackathon registration closes Wed 11:59 PM", type: ["i-deadline", "Deadline"] },
    { who: "Member 7", text: "forms.gle/… one form per team", type: ["i-link", "Link"] },
    { who: "Member 8", text: "[sticker]", type: null },
    { who: "Member 6", text: "Fixing farewell at ₹200 each, pay by Wed", type: ["i-decision", "Decision"] },
    { who: "Member 4", text: "ok ok", type: null },
    { who: "Member 12", text: "Is the 2nd-year bus at 7:40 or 8:10 tomorrow?", type: ["i-question", "Question"] },
    { who: "Member 10", text: "lol", type: null },
    { who: "Member 3", text: "ok", type: null },
    { who: "Member 6", text: "good night all", type: null },
  ];

  const stream = document.getElementById("stream");
  const box = document.getElementById("collapse");
  const num = document.getElementById("collapse-num");
  let running = [];

  function render() {
    stream.innerHTML = "";
    DEMO.forEach((m) => {
      const li = document.createElement("li");
      li.className = `msg ${m.type ? "msg--signal" : "msg--noise"}`;
      const tag = m.type
        ? `<span class="msg__type tag"><svg class="icon" aria-hidden="true"><use href="icons.svg#${m.type[0]}"></use></svg>${m.type[1]}</span>`
        : `<span></span>`;
      li.innerHTML = `<div class="msg__inner"><span class="msg__who"></span><span class="msg__text"></span>${tag}</div>`;
      li.querySelector(".msg__who").textContent = m.who;
      li.querySelector(".msg__text").textContent = m.text;
      stream.appendChild(li);
    });
  }

  function finalState() {
    stream.querySelectorAll(".msg--noise").forEach((li) => { li.style.height = "0px"; li.style.opacity = "0"; li.setAttribute("aria-hidden", "true"); });
    stream.querySelectorAll(".msg--signal").forEach((li) => li.classList.add("is-lit"));
    num.textContent = "9";
    box.dataset.phase = "signal";
  }

  function play() {
    running.forEach((s) => s.stop());
    running = [];
    render();
    box.dataset.phase = "noise";
    num.textContent = fmt(1284);
    if (prefersReduced()) { finalState(); return; }

    const signals = [...stream.querySelectorAll(".msg--signal")];
    const noise = [...stream.querySelectorAll(".msg--noise")];

    // 1. Signal lines get highlighted one by one.
    signals.forEach((li, i) => setTimeout(() => li.classList.add("is-lit"), 700 + i * 140));

    // 2. Noise collapses with a spring while the counter falls 1,284 -> 9.
    const start = 700 + signals.length * 140 + 300;
    setTimeout(() => {
      running.push(animate(1284, 9, "count", (v) => {
        num.textContent = fmt(v);
        if (v < 60 && box.dataset.phase !== "signal") box.dataset.phase = "signal";
      }));
      noise.forEach((li, i) => {
        setTimeout(() => {
          const h = li.getBoundingClientRect().height;
          li.setAttribute("aria-hidden", "true");
          running.push(animate(h, 0, "gentle", (v) => {
            li.style.height = Math.max(0, v) + "px";
            li.style.opacity = String(Math.max(0, v / h));
          }));
        }, i * 55);
      });
    }, start);
  }

  /* Masking loop: tokens flip between original and masked, only while visible. */
  function initMask() {
    const tokens = [...document.querySelectorAll("#mask-demo .tok")];
    if (prefersReduced()) {
      tokens.forEach((t) => { t.textContent = t.dataset.to; t.classList.add("is-masked"); });
      return;
    }
    let masked = false;
    let timer = 0;
    const flip = () => {
      masked = !masked;
      tokens.forEach((t, i) => setTimeout(() => {
        t.textContent = masked ? t.dataset.to : t.dataset.from;
        t.classList.toggle("is-masked", masked);
      }, i * 160));
      timer = setTimeout(flip, masked ? 3200 : 1800);
    };
    onVisible(document.getElementById("mask-demo"), (vis) => {
      clearTimeout(timer);
      if (vis) timer = setTimeout(flip, 600);
    }, false);
  }

  function initHeat() {
    const values = [22, 9, 4, 2, 1, 1, 6, 31, 48, 26, 19, 24, 38, 29, 21, 27, 35, 44, 52, 61, 73, 96, 138, 117];
    const max = Math.max(...values);
    const heat = document.getElementById("heat");
    values.forEach((v, h) => {
      const c = document.createElement("span");
      c.className = "heat__cell" + (v >= 110 ? " is-peak" : "");
      c.style.setProperty("--o", (0.08 + (v / max) * 0.8).toFixed(2));
      c.title = `${h}:00 to ${h + 1}:00, ${v} messages`;
      heat.appendChild(c);
    });
  }

  function initPolls() {
    document.querySelectorAll("[data-poll]").forEach((list) => {
      const items = [...list.querySelectorAll("li")];
      const total = items.reduce((a, li) => a + Number(li.dataset.v), 0);
      onVisible(list, () => {
        items.forEach((li, i) => {
          const fill = li.querySelector(".poll__fill");
          setTimeout(() => animate(0, Number(li.dataset.v) / total, "lift", (v) => { fill.style.transform = `scaleX(${Math.max(0, v)})`; }), i * 90);
        });
      });
    });
  }

  function initStats() {
    const els = document.querySelectorAll("#stats [data-count]");
    onVisible(document.getElementById("stats"), () => {
      els.forEach((el) => animate(0, Number(el.dataset.count), "count", (v) => { el.textContent = fmt(v); }));
    });
  }

  /* once=true fires a single time; once=false reports every visibility change. */
  function onVisible(el, cb, once = true) {
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (once && e.isIntersecting) { cb(true); io.disconnect(); }
        else if (!once) cb(e.isIntersecting);
      });
    }, { threshold: 0.35 });
    io.observe(el);
  }

  render();
  play();
  document.getElementById("replay").addEventListener("click", play);
  initMask();
  initHeat();
  initPolls();
  initStats();
})();
