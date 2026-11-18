"use client";

import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { THEME_KEY } from "./theme";

type Theme = "light" | "dark";

const THEME_COLORS: Record<Theme, string> = { light: "#ffffff", dark: "#0c1117" };

/** Light is the default for everyone; dark only when the user picks it here. */
function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Tracks <html data-theme>, so the icon follows the pre-paint script and every toggle. */
function subscribeToTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** Runs after hydration, so changing the server-rendered meta never causes a mismatch. */
function syncThemeColor(theme: Theme) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, currentTheme, () => "light");

  // Re-applies the saved theme after a dev-mode remount clears <html> attributes.
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
    } catch {
      // Storage blocked: the light default applies.
    }
  }, []);

  useEffect(() => syncThemeColor(theme), [theme]);

  const toggle = () => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the theme still applies for this visit.
    }
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button className="icon-btn" type="button" onClick={toggle} aria-label={label} title={label}>
      <Icon id={theme === "dark" ? "u-sun" : "u-moon"} />
    </button>
  );
}
