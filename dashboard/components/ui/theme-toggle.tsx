"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = localStorage.getItem("fr-theme") as "dark" | "light" | null;
    if (stored) {
      setTheme(stored);
      document.documentElement.className = stored;
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.className = next;
    localStorage.setItem("fr-theme", next);
  };

  return (
    <button
      onClick={toggle}
      className="rounded-md border border-border-subtle bg-bg-surface px-2 py-1.5 text-xs font-mono text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
