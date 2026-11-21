"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/** Runs in <head> before the page paints, so a saved choice never flashes the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("sf-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const current = (): Theme =>
  (document.documentElement.dataset.theme as Theme | undefined) ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

// Re-render when the theme attribute changes (this button) or the device switches light/dark.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/** Day / Night switch, fixed in the corner of every page. Remembers the choice in this browser. */
export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => null); // null on the server: it can't know the visitor's theme

  function toggle() {
    const next: Theme = current() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("sf-theme", next);
    } catch {
      /* private mode: the switch still works for this page */
    }
  }

  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to day theme" : "Switch to night theme"}
      title={dark ? "Day theme" : "Night theme"}
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-line bg-card px-3.5 py-2 text-sm shadow-lg transition hover:border-ink print:hidden"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {dark ? (
          <path d="M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
        ) : (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        )}
      </svg>
      <span>{theme === null ? "Theme" : dark ? "Day" : "Night"}</span>
    </button>
  );
}
