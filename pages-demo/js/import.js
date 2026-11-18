/* Import screen: tabs, drop zone with spring lift, real local detection + masking preview, state machine. */
(function () {
  const { Spring, animate } = window.Physics;
  const { detectFormat, pseudonymise } = window.Mask;
  const { toast } = window.CatchUp;

  const root = document.getElementById("import");
  const switcher = document.getElementById("switcher");
  let parseRun = null;

  const DEMO_SAMPLE = [
    "20/11/26, 08:12 - Rahul Menon: DBMS lab record moved to tomorrow 9 AM, Lab 3. Not Monday.",
    "20/11/26, 08:14 - Priya K: Rahul are you sure? Call me 98450 12345",
    "20/11/26, 21:14 - Ananya Rao: Farewell ₹200 each, send to ananya.rao@okaxis by Wednesday",
    "20/11/26, 21:20 - Karthik S: Mail the final list to karthik.s@example.com",
  ].join("\n");

  /* ---------- State machine ---------- */
  function setState(state, opts = {}) {
    root.dataset.state = state;
    const radio = switcher.querySelector(`input[value="${state}"]`);
    if (radio) radio.checked = true;
    if (parseRun) { parseRun.cancel(); parseRun = null; }
    if (state === "parsing") parseRun = runParsing();
    if (state === "done" && !opts.silent) toast("Catch-up ready: 9 things from 1,284 messages");
    if (state === "error" && !opts.silent) toast("No messages found in that file", "error");
    document.getElementById("go").disabled = state === "empty" || state === "error" || state === "loading";
    document.getElementById("go-hint").textContent = state === "empty"
      ? "Add a file, paste text or add screenshots first."
      : "About 20 seconds for 1,000 messages.";
  }

  switcher.addEventListener("change", (e) => {
    selectTab("tab-file");
    setState(e.target.value, { silent: false });
  });

  /* ---------- Parsing simulation: 4 stages, spring-driven bar ---------- */
  function runParsing() {
    const fill = document.getElementById("bar-fill");
    const bar = document.getElementById("bar");
    const pct = document.getElementById("pct");
    const stages = [...document.querySelectorAll("#stages li")];
    const count = document.getElementById("stage-count");
    const targets = [18, 46, 74, 100];
    const timers = [];
    const s = new Spring(0, "settle", (v) => {
      const p = Math.max(0, Math.min(100, v));
      fill.style.transform = `scaleX(${p / 100})`;
      pct.textContent = `${Math.round(p)}%`;
      bar.setAttribute("aria-valuenow", String(Math.round(p)));
    });
    stages.forEach((li) => li.classList.remove("is-active", "is-done"));
    s.to(0);
    targets.forEach((t, i) => {
      timers.push(setTimeout(() => {
        stages.forEach((li, j) => { li.classList.toggle("is-done", j < i); li.classList.toggle("is-active", j === i); });
        if (i === 1) animate(0, 1284, "count", (v) => { count.textContent = Math.round(v).toLocaleString("en-IN"); });
        s.to(t);
      }, 200 + i * 900));
    });
    timers.push(setTimeout(() => {
      stages.forEach((li) => { li.classList.remove("is-active"); li.classList.add("is-done"); });
      timers.push(setTimeout(() => setState("done"), 450));
    }, 200 + targets.length * 900));
    return { cancel() { timers.forEach(clearTimeout); s.stop(); } };
  }

  /* ---------- Tabs (WAI-ARIA, roving tabindex) ---------- */
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function selectTab(id) {
    tabs.forEach((t) => {
      const on = t.id === id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t.id));
    t.addEventListener("keydown", (e) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (e.key === "Home" || e.key === "End" || dir) {
        e.preventDefault();
        const next = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (i + dir + tabs.length) % tabs.length;
        selectTab(tabs[next].id);
        tabs[next].focus();
      }
    });
  });
  document.querySelectorAll("[data-goto-tab]").forEach((b) => b.addEventListener("click", () => {
    selectTab(b.dataset.gotoTab);
    document.getElementById(b.dataset.gotoTab).focus();
  }));

  /* ---------- Drop zones: spring lift while a file hovers ---------- */
  function initDropzone(zone, input, onFiles) {
    const lift = new Spring(0, "lift", (v) => {
      zone.style.transform = `translateY(${-v * 6}px) scale(${1 + v * 0.012})`;
      zone.style.boxShadow = v > 0.02 ? `0 ${Math.round(v * 24)}px ${Math.round(v * 48)}px -24px rgb(14 26 36 / ${(v * 0.35).toFixed(2)})` : "";
    });
    let depth = 0;
    zone.addEventListener("dragenter", (e) => { e.preventDefault(); depth++; zone.classList.add("is-over"); lift.to(1); });
    zone.addEventListener("dragover", (e) => e.preventDefault());
    zone.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) { zone.classList.remove("is-over"); lift.to(0); } });
    zone.addEventListener("drop", (e) => {
      e.preventDefault(); depth = 0; zone.classList.remove("is-over"); lift.to(0);
      if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
    });
    input.addEventListener("change", () => { if (input.files.length) onFiles(input.files); input.value = ""; });
  }

  function humanSize(bytes) {
    return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
  }

  function handleFile(files) {
    const file = files[0];
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    document.getElementById("file-name").textContent = file.name;
    document.getElementById("file-size").textContent = humanSize(file.size);
    if (file.size > 20e6) { document.getElementById("err-name").textContent = file.name; setState("error"); return; }
    setState("loading");
    if (ext === "zip") {
      // Concept only: the real app unzips in a worker. Show the demo detection.
      setTimeout(() => { document.getElementById("detected-label").textContent = "WhatsApp (Android, 24h, DD/MM)"; setState("detected"); }, 900);
      return;
    }
    if (ext !== "txt" && ext !== "json") {
      setTimeout(() => { document.getElementById("err-name").textContent = file.name; setState("error"); }, 700);
      return;
    }
    file.text().then((text) => {
      const format = detectFormat(text);
      setTimeout(() => {
        if (!format) { document.getElementById("err-name").textContent = file.name; setState("error"); return; }
        document.getElementById("detected-label").textContent = format;
        const lines = text.split(/\r?\n/).filter(Boolean).length;
        document.getElementById("kv-msgs").textContent = lines.toLocaleString("en-IN");
        renderPreview(text, `First lines of ${file.name}, as they would be sent.`);
        setState("detected");
      }, 600);
    }).catch(() => { document.getElementById("err-name").textContent = file.name; setState("error"); });
  }

  initDropzone(document.getElementById("dropzone"), document.getElementById("file-input"), handleFile);
  initDropzone(document.getElementById("shotzone"), document.getElementById("shot-input"), (files) => {
    toast(`${Math.min(files.length, 10)} screenshot${files.length > 1 ? "s" : ""} added. Text is read on this device.`);
    setState("detected");
  });

  document.getElementById("retry").addEventListener("click", () => { setState("empty"); document.getElementById("file-input").focus(); });
  document.getElementById("remove-file").addEventListener("click", () => { setState("empty"); renderPreview(DEMO_SAMPLE); });
  document.getElementById("go").addEventListener("click", () => setState("parsing"));

  /* ---------- Privacy preview ---------- */
  const preview = document.getElementById("preview");
  const showOriginal = document.getElementById("show-original");
  let lastText = DEMO_SAMPLE;

  function escapeHtml(s) { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  function renderPreview(text, sub) {
    lastText = text;
    if (sub) document.getElementById("privacy-sub").textContent = sub;
    const { lines, members } = pseudonymise(text);
    const shown = lines.slice(0, 5);
    const original = showOriginal.checked;
    preview.innerHTML = shown.length ? "" : `<li class="hint">Paste or drop a chat to see exactly what would be sent.</li>`;
    let hits = 0;
    shown.forEach((l) => {
      hits += l.hits;
      const li = document.createElement("li");
      const who = original ? l.realWho : l.who;
      const body = original
        ? escapeHtml(l.original)
        : escapeHtml(l.masked).replace(/\u0000(.*?)\u0001/g, (_, label) => `<mark>${label}</mark>`);
      li.innerHTML = `${who ? `<span class="who"></span>` : ""}${body}`;
      if (who) li.querySelector(".who").textContent = who;
      preview.appendChild(li);
    });
    document.getElementById("privacy-count").textContent = shown.length
      ? `${members} ${members === 1 ? "person" : "people"} renamed, ${hits} detail${hits === 1 ? "" : "s"} masked in these lines.${original ? " Original shown on this device only." : ""}`
      : "";
  }

  showOriginal.addEventListener("change", () => renderPreview(lastText));

  let debounce = 0;
  const paste = document.getElementById("paste");
  paste.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const text = paste.value;
      const format = detectFormat(text);
      document.getElementById("paste-hint").textContent = text.trim()
        ? (format ? `Detected: ${format}. Preview updated on the right.` : "Can't tell the format yet. Each line should start with a date or a name.")
        : "The privacy preview on the right updates as you type. Nothing is sent until you press Make my catch-up.";
      if (text.trim()) {
        renderPreview(text, "Your pasted text, exactly as it would be sent.");
        if (format) { document.getElementById("detected-label").textContent = format; if (root.dataset.state === "empty") setState("detected", { silent: true }); }
      } else {
        renderPreview(DEMO_SAMPLE, "A sample from the demo file, exactly as it would be sent.");
      }
    }, 120);
  });

  /* ---------- Range stepper ---------- */
  let days = 3;
  const out = document.getElementById("days-out");
  const setDays = (n) => { days = Math.max(1, Math.min(30, n)); out.textContent = `${days} day${days > 1 ? "s" : ""}`; };
  document.getElementById("days-minus").addEventListener("click", () => setDays(days - 1));
  document.getElementById("days-plus").addEventListener("click", () => setDays(days + 1));

  renderPreview(DEMO_SAMPLE);
  setState("empty", { silent: true });
})();
