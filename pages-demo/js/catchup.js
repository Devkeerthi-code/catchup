/* Catch-up screen: timeline strip, source cards with context expand, local insights charts. */
(function () {
  const { animate, springHeight, prefersReduced } = window.Physics;
  const { toast, downloadIcs, initPress } = window.CatchUp;
  const D = window.DEMO_CATCHUP;
  const icon = (id, cls = "icon") => `<svg class="${cls}" aria-hidden="true"><use href="icons.svg#${id}"></use></svg>`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byTime = [...D.items].sort((a, b) => a.hour - b.hour);

  /* ---------- Timeline ---------- */
  function renderTimeline() {
    const max = Math.max(...D.hours);
    const bands = document.getElementById("bands");
    bands.innerHTML = D.bands.map((b) => {
      const bars = [];
      for (let h = b.from; h < b.to; h++) {
        for (let q = 0; q < 4; q++) {
          const wobble = 0.65 + 0.35 * Math.abs(Math.sin((h * 4 + q) * 1.7));
          bars.push(`<i style="height:${Math.max(6, (D.hours[h] / max) * 100 * wobble).toFixed(0)}%"></i>`);
        }
      }
      const items = byTime.filter((it) => it.hour >= b.from && it.hour < b.to).map((it) => {
        const x = ((it.hour - b.from) / (b.to - b.from)) * 100;
        const t = D.types[it.type];
        return `<li class="tl-item${it.urgent ? " is-urgent" : ""}" style="--x:${x.toFixed(1)};--row:${it.row}" data-tl>
          <a href="#item-${it.id}" data-jump="${it.id}">${icon(t.icon)}<span class="visually-hidden">${t.label}: </span><span class="tl-item__t">${esc(it.short)}</span><time>${it.source.time}</time></a></li>`;
      }).join("");
      return `<div class="band">
        <div class="band__label">${b.label}<small>${b.range}</small></div>
        <div class="band__track">
          <div class="band__density" aria-hidden="true">${bars.join("")}</div>
          <ul class="band__items" aria-label="${b.label}">${items || `<li class="chip-meta" style="padding:4px 8px">Nothing important</li>`}</ul>
        </div>
      </div>`;
    }).join("");

    // Items slide into their time slot, in the order they happened.
    const els = [...bands.querySelectorAll("[data-tl]")];
    els.forEach((el, i) => {
      if (prefersReduced()) return;
      el.style.opacity = "0";
      el.style.translate = "-28px 0";
      setTimeout(() => animate(0, 1, "settle", (v) => {
        el.style.opacity = String(Math.min(1, v * 1.4));
        el.style.translate = `${(1 - v) * -28}px 0`;
      }), 250 + i * 90);
    });
  }

  /* ---------- Cards ---------- */
  function facts(it) {
    if (!it.facts) return "";
    return `<dl class="facts">${it.facts.map(([ic, k, v]) => `<div><dt>${icon(ic)}<span class="visually-hidden">${k}</span></dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`;
  }

  function poll(it) {
    if (!it.poll) return "";
    const top = Math.max(...it.poll.map((p) => p[1]));
    return `<ul class="poll" data-poll-total="${it.poll.reduce((a, p) => a + p[1], 0)}">${it.poll.map(([label, n]) =>
      `<li class="${n === top ? "is-winner" : ""}" data-v="${n}"><span class="poll__label"><span>${esc(label)}</span><b>${n}</b></span><span class="poll__track"><span class="poll__fill"></span></span></li>`).join("")}</ul>`;
  }

  function linkRow(it) {
    if (!it.domain) return "";
    return `<div class="linkrow"><span class="favicon" aria-hidden="true">${it.domain[0].toUpperCase()}</span>
      <div><div class="linkrow__domain">${esc(it.domain)}</div><div style="font-size:var(--text-sm);font-weight:500">${esc(it.meta)}</div></div>
      <span class="dupe">Shared ${it.dupes}×, kept once</span></div>`;
  }

  function actions(it) {
    const out = [];
    if (it.ics) out.push(`<button class="btn btn--primary btn--sm" type="button" data-press data-ics-id="${it.id}">${icon("u-cal-plus")}Add to calendar (.ics)</button>`);
    if (it.domain) out.push(`<button class="btn btn--secondary btn--sm" type="button" data-press data-demo-link>${icon("u-external")}Open link</button>`);
    if (it.type === "question") out.push(`<button class="btn btn--secondary btn--sm" type="button" data-press data-copy="${esc(it.title)}">${icon("g-clipboard")}Copy question to answer</button>`);
    out.push(`<button class="btn btn--ghost btn--sm ctx-btn" type="button" data-press aria-expanded="false" aria-controls="ctx-${it.id}">Open in context${icon("u-chevron")}</button>`);
    return `<div class="item__actions">${out.join("")}</div>`;
  }

  function context(it) {
    const rows = it.context.map(([t, who, text, isSource]) =>
      `<li class="${isSource ? "is-source" : ""}"><time>${t}</time><span><b>${who}</b>${esc(text)}</span></li>`).join("");
    return `<div class="context" id="ctx-${it.id}" hidden style="height:0">
      <ol class="context__list" aria-label="Messages around ${it.source.time}">${rows}</ol>
      <p class="context__note">${it.context.length} messages around ${it.source.time}. Names and numbers stay masked.</p></div>`;
  }

  function card(it) {
    const t = D.types[it.type];
    const n = it.source.who.replace(/\D/g, "");
    return `<article class="card item" id="item-${it.id}" aria-labelledby="item-${it.id}-t">
      <div class="item__top">
        <span class="tag">${icon(t.icon)}${t.label}</span>
        ${it.urgent ? `<span class="chip-urgent">${it.urgent}</span>` : ""}
        <span class="chip-meta">${esc(it.domain ? "" : it.meta || "")}</span>
      </div>
      <h3 id="item-${it.id}-t">${esc(it.title)}</h3>
      ${it.desc ? `<p class="item__desc">${esc(it.desc)}</p>` : ""}
      ${facts(it)}${poll(it)}${linkRow(it)}
      <blockquote class="source">
        <p class="source__who"><span class="av" aria-hidden="true">${n}</span>${it.source.who} · ${it.source.time}</p>
        <p>${it.source.text}</p>
      </blockquote>
      ${actions(it)}
      ${context(it)}
    </article>`;
  }

  function renderSections() {
    const host = document.getElementById("sections");
    const nav = document.getElementById("secnav");
    host.innerHTML = D.sections.map((s) => {
      const items = D.items.filter((it) => it.type === s.type);
      return `<section class="cu-section" id="sec-${s.id}" aria-labelledby="h-${s.id}">
        <div class="cu-section__head">${icon(D.types[s.type].icon)}<h2 id="h-${s.id}">${s.title}</h2><span class="count">${items.length}</span></div>
        ${items.map(card).join("")}
      </section>`;
    }).join("");
    nav.innerHTML = D.sections.map((s) =>
      `<li><a href="#sec-${s.id}">${icon(D.types[s.type].icon)}${s.title}<b>${D.items.filter((it) => it.type === s.type).length}</b></a></li>`).join("");
    initPress(host);
  }

  function bindCards() {
    document.querySelectorAll(".ctx-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        btn.closest(".item").classList.toggle("is-open", open);
        btn.firstChild.textContent = open ? "Hide context" : "Open in context";
        springHeight(document.getElementById(btn.getAttribute("aria-controls")), open);
      });
    });
    document.querySelectorAll("[data-ics-id]").forEach((btn) => {
      const it = D.items.find((x) => x.id === btn.dataset.icsId);
      btn.addEventListener("click", () => downloadIcs({ ...it.ics, start: new Date(it.ics.start) }));
    });
    document.querySelectorAll("[data-demo-link]").forEach((btn) => btn.addEventListener("click", () => toast("Demo link: in the app this opens the real URL in a new tab")));
    document.querySelectorAll("[data-copy]").forEach((btn) => btn.addEventListener("click", () => copy(btn.dataset.copy, "Question copied. Paste it in the group with your answer.")));
  }

  /* ---------- Jumping from TL;DR / timeline to a card ---------- */
  function jumpTo(id) {
    const el = document.getElementById(`item-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth", block: "start" });
    el.classList.add("is-flash");
    setTimeout(() => el.classList.remove("is-flash"), 1400);
    el.setAttribute("tabindex", "-1");
    el.focus({ preventScroll: true });
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#item-"]');
    if (!a) return;
    e.preventDefault();
    jumpTo(a.getAttribute("href").slice(6));
  });

  function initSecnav() {
    const links = [...document.querySelectorAll("#secnav a")];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.setAttribute("aria-current", String(l.getAttribute("href") === `#${e.target.id}`)));
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    document.querySelectorAll(".cu-section").forEach((s) => io.observe(s));
  }

  /* ---------- Insights (inline SVG, computed locally) ---------- */
  function hoursChart() {
    const max = Math.max(...D.hours);
    const bars = D.hours.map((v, h) => {
      const hgt = (v / max) * 56;
      return `<rect class="bar${v >= 110 ? " is-peak" : ""}" x="${h * 10}" y="${60 - hgt}" width="7" height="${hgt}" rx="1.5"><title>${h}:00, ${v} messages</title></rect>`;
    }).join("");
    const labels = [["12a", 0], ["6a", 60], ["12p", 120], ["6p", 180], ["11p", 230]].map(([t, x]) => `<text class="axis" x="${x}" y="74">${t}</text>`).join("");
    document.getElementById("chart-hours").innerHTML =
      `<svg viewBox="0 0 240 78" role="img" aria-label="Messages per hour. Peak 10 to 11 PM with 138 messages.">${bars}${labels}</svg>`;
  }

  function daysChart() {
    const max = Math.max(...D.days.map((d) => d.n));
    const pts = D.days.map((d, i) => [10 + i * 36, 66 - (d.n / max) * 56]);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1].toFixed(1)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1][0]},66 L${pts[0][0]},66 Z`;
    const dots = pts.map((p) => `<circle class="dot" cx="${p[0]}" cy="${p[1].toFixed(1)}" r="3"/>`).join("");
    const labels = D.days.map((d, i) => `<text class="axis" x="${pts[i][0]}" y="82" text-anchor="middle">${d.d}</text>`).join("");
    document.getElementById("chart-days").innerHTML =
      `<svg viewBox="0 0 240 86" role="img" aria-label="Messages per day for the last 7 days. Friday had 1,284, the highest."><path class="area" d="${area}"/><path class="line" d="${line}"/>${dots}${labels}</svg>`;
  }

  function hbars(id, rows) {
    const max = Math.max(...rows.map((r) => r[1]));
    const el = document.getElementById(id);
    el.innerHTML = rows.map(([name, v]) =>
      `<li><span class="hbars__name">${esc(name)}</span><span class="hbars__track"><span class="hbars__fill" style="--v:0" data-v="${(v / max).toFixed(3)}"></span></span><span class="hbars__val">${v}</span></li>`).join("");
  }

  function animateBarsOnView() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        e.target.querySelectorAll("[data-v]").forEach((li, i) => {
          const fill = li.classList.contains("hbars__fill") ? li : li.querySelector(".poll__fill");
          const total = Number(e.target.dataset.pollTotal || 1);
          const target = li.classList.contains("hbars__fill") ? Number(li.dataset.v) : Number(li.dataset.v) / total;
          setTimeout(() => animate(0, target, "lift", (v) => {
            if (fill.classList.contains("hbars__fill")) fill.style.setProperty("--v", Math.max(0, v).toFixed(3));
            else fill.style.transform = `scaleX(${Math.max(0, v)})`;
          }), i * 80);
        });
      });
    }, { threshold: 0.4 });
    document.querySelectorAll(".hbars, [data-poll-total]").forEach((el) => io.observe(el));
  }

  /* ---------- Misc ---------- */
  function copy(text, msg) {
    if (!navigator.clipboard) { toast("Copying isn't available in this browser", "error"); return; }
    navigator.clipboard.writeText(text).then(() => toast(msg), () => toast("Couldn't copy. Select the text and copy it manually.", "error"));
  }
  document.getElementById("copy-tldr").addEventListener("click", () => {
    const lines = [...document.querySelectorAll("#tldr li")].map((li, i) => `${i + 1}. ${li.textContent.trim()}`);
    copy(`CSE-B 2nd Year catch-up (demo)\n${lines.join("\n")}`, "TL;DR copied. Paste it anywhere.");
  });

  document.getElementById("save-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("save-email");
    const pass = document.getElementById("save-pass");
    const err = document.getElementById("save-error");
    const btn = e.target.querySelector("button[type=submit]");
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value);
    const passOk = pass.value.length >= 8;
    email.setAttribute("aria-invalid", String(!emailOk));
    pass.setAttribute("aria-invalid", String(!passOk));
    if (!emailOk || !passOk) {
      err.textContent = !emailOk ? "Enter an email like name@example.com." : "Password needs at least 8 characters.";
      (!emailOk ? email : pass).focus();
      return;
    }
    err.textContent = "";
    btn.disabled = true;
    btn.textContent = "Saving…";
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "Save catch-up";
      toast("Concept only: nothing was saved. The app stores the summary, never the chat.");
    }, 700);
  });

  function scoreIn() {
    const el = document.getElementById("score");
    animate(1284, 9, "count", (v) => { el.textContent = Math.round(v).toLocaleString("en-IN"); });
  }

  renderTimeline();
  renderSections();
  bindCards();
  initSecnav();
  hoursChart();
  daysChart();
  hbars("chart-members", D.members);
  hbars("chart-domains", D.domains);
  animateBarsOnView();
  scoreIn();
})();
