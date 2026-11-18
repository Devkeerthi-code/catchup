/* Shared behaviour: theme toggle, spring press feedback, accordions, toasts, .ics export. */
(function () {
  const { Spring, springHeight } = window.Physics;
  const root = document.documentElement;
  const THEME_KEY = "catchup-theme";

  const THEME_COLORS = { light: "#ffffff", dark: "#0c1117" };

  /* Light is the default for everyone; dark only when the visitor picks it. */
  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function syncThemeColor() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[currentTheme()]);
  }

  function syncThemeButton(btn) {
    const theme = currentTheme();
    const next = theme === "dark" ? "light" : "dark";
    btn.setAttribute("aria-label", `Switch to ${next} theme`);
    btn.querySelector("use").setAttribute("href", `icons.svg#u-${theme === "dark" ? "sun" : "moon"}`);
  }

  function initTheme() {
    syncThemeColor();
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      syncThemeButton(btn);
      btn.addEventListener("click", () => {
        const next = currentTheme() === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        try { localStorage.setItem(THEME_KEY, next); } catch { /* storage blocked: theme still applies for this visit */ }
        syncThemeButton(btn);
        syncThemeColor();
      });
    });
  }

  /* Pressable elements sink 3% on press and spring back with a touch of overshoot. */
  function initPress(scope = document) {
    scope.querySelectorAll("[data-press]:not([data-press-bound])").forEach((el) => {
      el.setAttribute("data-press-bound", "");
      const s = new Spring(1, "snappy", (v) => { el.style.transform = `scale(${v})`; });
      const release = () => { s.config = window.Physics.SPRINGS.lift; s.to(1); };
      el.addEventListener("pointerdown", () => { s.config = window.Physics.SPRINGS.snappy; s.to(0.965); });
      el.addEventListener("pointerup", release);
      el.addEventListener("pointerleave", release);
      el.addEventListener("pointercancel", release);
    });
  }

  function initAccordions() {
    document.querySelectorAll("[data-accordion] [aria-controls]").forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        springHeight(panel, open);
      });
    });
  }

  function toast(message, kind = "success") {
    const region = document.getElementById("toasts");
    if (!region) return;
    const el = document.createElement("div");
    el.className = `toast toast--${kind}`;
    el.innerHTML = `<svg class="icon" aria-hidden="true"><use href="icons.svg#${kind === "error" ? "u-alert" : "u-check"}"></use></svg><span></span>`;
    el.querySelector("span").textContent = message;
    region.appendChild(el);
    const s = new Spring(24, "lift", (v) => {
      el.style.transform = `translateY(${v}px)`;
      el.style.opacity = String(1 - Math.min(1, Math.max(0, v / 24)));
    });
    s.to(0);
    setTimeout(() => s.to(24, () => el.remove()), 3600);
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function icsStamp(d) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  }
  function icsEscape(s) { return s.replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n"); }

  /* Real .ics file generated in the browser: no server round-trip, nothing uploaded. */
  function downloadIcs({ title, start, minutes = 60, location = "", note = "" }) {
    const end = new Date(start.getTime() + minutes * 60000);
    const body = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CatchUp//Concept//EN", "BEGIN:VEVENT",
      `UID:${Date.now()}@catchup.local`, `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`,
      `SUMMARY:${icsEscape(title)}`, `LOCATION:${icsEscape(location)}`, `DESCRIPTION:${icsEscape(note)}`,
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/calendar" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${title.replace(/[^\w]+/g, "-").toLowerCase()}.ics` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Calendar file saved: ${title}`);
  }

  function initIcsButtons() {
    document.querySelectorAll("[data-ics]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const { title, start, minutes, location, note } = JSON.parse(btn.dataset.ics);
        downloadIcs({ title, start: new Date(start), minutes, location, note });
      });
    });
  }

  initTheme();
  initPress();
  initAccordions();
  initIcsButtons();
  window.CatchUp = { toast, downloadIcs, initPress };
})();
