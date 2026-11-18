import { prefersReducedMotion } from "@/lib/ui/spring";

/** Scrolls to an item card, flashes the highlighter ring on it and moves focus there. */
export function jumpToItem(itemId: string): void {
  const el = document.getElementById(`item-${itemId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  el.classList.add("is-flash");
  window.setTimeout(() => el.classList.remove("is-flash"), 1400);
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}
