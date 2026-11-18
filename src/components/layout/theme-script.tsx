"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";
import { THEME_SCRIPT } from "./theme";

/**
 * Inserts the theme script into the server HTML once, so it runs before first paint. Rendering a
 * <script> element from a component would make React warn on client renders; this never does.
 */
export function ThemeScript() {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
  });
  return null;
}
