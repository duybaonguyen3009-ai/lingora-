import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ── Typography Scale (DS-1) ──────────────────────────────────── */
      /* 6 sizes only. Use these instead of arbitrary text-[Npx].       */
      /* Mapping: xs=12, sm=14, base=16, lg=20, xl=24, 2xl=32          */
      fontSize: {
        xs:   ["0.75rem",  { lineHeight: "1rem" }],      // 12px / 16px
        sm:   ["0.875rem", { lineHeight: "1.25rem" }],    // 14px / 20px
        base: ["1rem",     { lineHeight: "1.5rem" }],     // 16px / 24px
        lg:   ["1.25rem",  { lineHeight: "1.75rem" }],    // 20px / 28px
        xl:   ["1.5rem",   { lineHeight: "2rem" }],       // 24px / 32px
        "2xl":["2rem",     { lineHeight: "2.5rem" }],     // 32px / 40px
      },

      /* ── Spacing Scale (DS-2) ─────────────────────────────────────── */
      /* 4px base grid. Use these instead of arbitrary [Npx] spacing.   */
      /* Tailwind default 1=4px, 2=8px, 3=12px, 4=16px, 6=24px,        */
      /* 8=32px, 12=48px, 16=64px — all already on the 4px grid.       */
      /* We keep Tailwind defaults and add semantic aliases.             */
      spacing: {
        "4.5": "1.125rem",  // 18px → snaps to nearest (use 4=16px or 5=20px instead, but keep for migration)
      },

      colors: {
        bg: {
          DEFAULT: "#0B0F1E",
          2: "#111631",
          3: "#161B3A",
        },
        accent: {
          cyan: "#38BDF8",
          blue: "#3B82F6",
        },
        primary: "#E6EDF3",
        secondary: "#8B92AB",
      },

      fontFamily: {
        sora: ["Sora", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
      },

      borderColor: {
        DEFAULT: "rgba(255,255,255,0.06)",
      },

      /* ── Border Radius Scale (DS-3) ──────────────────────────────── */
      /* 3 values + full. Use these instead of arbitrary rounded-[Npx]. */
      borderRadius: {
        sm:   "6px",     // buttons, inputs, small pills
        md:   "12px",    // cards, modals, larger interactive
        lg:   "16px",    // featured cards, hero sections
        full: "9999px",  // avatars, circular badges
      },

      /* ── Shadow Scale (DS-8) ──────────────────────────────────────── */
      /* 4 elevations + 2 glows. No inline boxShadow allowed.           */
      boxShadow: {
        sm:        "0 1px 2px rgba(0,0,0,0.05)",
        md:        "0 4px 12px rgba(0,0,0,0.08)",
        lg:        "0 8px 24px rgba(0,0,0,0.12)",
        xl:        "0 16px 48px rgba(0,0,0,0.16)",
        "glow-primary": "0 0 20px rgba(124,92,252,0.2)",
        "glow-accent":  "0 0 20px rgba(56,189,248,0.2)",
      },

      /* ── Motion (DS-9) ────────────────────────────────────────────── */
      /* 3 durations: fast=150ms, normal=250ms, slow=400ms              */
      /* Easing defined as CSS variables in globals.css                  */
      transitionDuration: {
        fast:   "150ms",
        normal: "250ms",
        slow:   "400ms",
      },

      keyframes: {
        fadeSlideUp: {
          "0%":   { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 6px rgba(124,92,252,0.4)" },
          "50%":      { boxShadow: "0 0 14px rgba(124,92,252,0.7)" },
        },
        progressFill: {
          "0%":   { width: "0%" },
          "100%": { width: "var(--progress-target)" },
        },
        countUp: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        fadeSlideUp: "fadeSlideUp 0.45s ease both",
        pulseGlow:   "pulseGlow 2s ease-in-out infinite",
        countUp:     "countUp 0.5s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
