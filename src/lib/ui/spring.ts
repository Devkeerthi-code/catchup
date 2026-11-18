/**
 * A tiny damped-spring integrator (stiffness / damping / mass, same numbers as the design spec).
 * Values are written through a callback so callers can update a style without re-rendering.
 */
export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export const SPRINGS = {
  snappy: { stiffness: 520, damping: 36, mass: 1 },
  lift: { stiffness: 380, damping: 26, mass: 1 },
  gentle: { stiffness: 200, damping: 24, mass: 1 },
  settle: { stiffness: 140, damping: 18, mass: 1 },
  count: { stiffness: 60, damping: 16, mass: 1 },
} satisfies Record<string, SpringConfig>;

export type SpringName = keyof typeof SPRINGS;

const STEP = 1 / 240;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class Spring {
  value: number;
  private target: number;
  private velocity = 0;
  private raf = 0;
  private last = 0;
  private onDone: (() => void) | null = null;
  config: SpringConfig;

  constructor(
    value: number,
    config: SpringConfig | SpringName,
    private readonly onUpdate: (value: number) => void,
  ) {
    this.value = value;
    this.target = value;
    this.config = typeof config === "string" ? SPRINGS[config] : config;
  }

  to(target: number, onDone?: () => void): this {
    this.target = target;
    this.onDone = onDone ?? null;
    if (prefersReducedMotion()) {
      this.stop();
      this.value = target;
      this.velocity = 0;
      this.onUpdate(target);
      this.onDone?.();
      return this;
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
    return this;
  }

  private tick = (now: number) => {
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
      this.onUpdate(this.value);
      this.onDone?.();
      return;
    }
    this.onUpdate(this.value);
    this.raf = requestAnimationFrame(this.tick);
  };

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}

/** One-shot spring from `from` to `to`. Returns a stop function for effect cleanups. */
export function animateSpring(
  from: number,
  to: number,
  config: SpringConfig | SpringName,
  onUpdate: (value: number) => void,
  onDone?: () => void,
): () => void {
  const spring = new Spring(from, config, onUpdate);
  spring.to(to, onDone);
  return () => spring.stop();
}
