"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";
const EVENT = "matrix-theme-change";

// Theme lives on <html data-theme> (set pre-paint by the layout script) + localStorage.
// useSyncExternalStore reads it without a set-state-in-effect and stays hydration-safe.
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
const getTheme = (): Theme =>
  (document.documentElement.getAttribute("data-theme") as Theme) || "dark";

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "dark");
  const light = theme === "light";

  const toggle = () => {
    const next: Theme = light ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("matrix-theme", next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label={light ? "Σκούρο θέμα" : "Φωτεινό θέμα"}
      title={light ? "Εναλλαγή σε σκούρο" : "Εναλλαγή σε φωτεινό"}
      onClick={toggle}
      className={[styles.switch, light ? styles.on : ""].filter(Boolean).join(" ")}
    >
      <Moon size={12} className={styles.end} />
      <Sun size={12} className={styles.end} />
      <span className={styles.knob}>
        {light ? <Sun size={12} /> : <Moon size={12} />}
      </span>
    </button>
  );
}
