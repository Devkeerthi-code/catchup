/* A tiny damped-spring integrator. Same parameter names as Motion (stiffness / damping / mass)
   so the Next.js build can swap this for `motion` springs with identical numbers. */
(function () {
  const SPRINGS = {
    snappy: { stiffness: 520, damping: 36, mass: 1 }, // presses, hovers: settles in ~150ms
    lift: { stiffness: 380, damping: 26, mass: 1 },   // drop-zone lift, card hover: tiny overshoot
    gentle: { stiffness: 200, damping: 24, mass: 1 }, // expand/collapse height, accordion
    settle: { stiffness: 140, damping: 18, mass: 1 }, // timeline items sliding into place
    count: { stiffness: 60, damping: 16, mass: 1 },   // hero counter collapse (slow, weighty)
  };

  const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReduced = () => reducedQuery.matches;
  const STEP = 1 / 240;

  class Spring {
    constructor(value, config, onUpdate) {
      this.value = value;
      this.target = value;
      this.velocity = 0;
      this.config = typeof config === "string" ? SPRINGS[config] : config;
      this.onUpdate = onUpdate;
      this.raf = 0;
      this.done = null;
    }

    to(target, onDone) {
      this.target = target;
      this.done = onDone || null;
      if (prefersReduced()) {
        this.value = target;
        this.velocity = 0;
        this.onUpdate(target, 0);
        if (this.done) this.done();
        return this;
      }
      if (!this.raf) {
        this.last = performance.now();
        this.raf = requestAnimationFrame((t) => this.tick(t));
      }
      return this;
    }

    tick(now) {
      const { stiffness, damping, mass } = this.config;
      const dt = Math.min((now - this.last) / 1000, 0.064);
      this.last = now;
      const steps = Math.max(1, Math.ceil(dt / STEP));
      const h = dt / steps;
      for (let i = 0; i < steps; i++) {
        const accel = (-stiffness * (this.value - this.target) - damping * this.velocity) / mass;
        this.velocity += accel * h;
        this.value += this.velocity * h;
      }
      const eps = Math.max(Math.abs(this.target) * 0.0005, 0.002);
      if (Math.abs(this.velocity) < eps * 10 && Math.abs(this.value - this.target) < eps) {
        this.value = this.target;
        this.velocity = 0;
        this.raf = 0;
        this.onUpdate(this.value, 0);
        if (this.done) this.done();
        return;
      }
      this.onUpdate(this.value, this.velocity);
      this.raf = requestAnimationFrame((t) => this.tick(t));
    }

    stop() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  function animate(from, to, config, onUpdate, onDone) {
    const s = new Spring(from, config, onUpdate);
    s.to(to, onDone);
    return s;
  }

  /* Expand/collapse an element's height with a spring, ending on `auto` so content can reflow. */
  function springHeight(el, open, config = "gentle") {
    const start = el.getBoundingClientRect().height;
    el.hidden = false;
    el.style.height = "auto";
    const end = open ? el.scrollHeight : 0;
    el.style.height = start + "px";
    el.style.overflow = "hidden";
    if (el._spring) el._spring.stop();
    el._spring = animate(start, end, config, (v) => {
      el.style.height = Math.max(0, v) + "px";
      el.style.opacity = String(Math.min(1, Math.max(0, v / Math.max(end, start, 1))));
    }, () => {
      el.style.height = open ? "auto" : "0px";
      el.style.overflow = open ? "" : "hidden";
      el.style.opacity = open ? "" : "0";
      if (!open) el.hidden = true;
    });
  }

  window.Physics = { Spring, animate, springHeight, SPRINGS, prefersReduced };
})();
