"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "./Icons";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-8 h-8" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
      style={{
        // PR4a fix #2 — --color-primary-soft was semantically inconsistent
        // (near-black tint in light vs teal tint in dark). --color-icon-muted
        // is a symmetric muted-foreground tone across both modes.
        backgroundColor: "transparent",
        color: "var(--color-icon-muted)",
      }}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
    </button>
  );
}
