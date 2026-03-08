import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#071A2F",
          2: "#0B2239",
          3: "#102A43",
        },
        accent: {
          cyan: "#2ED3C6",
          blue: "#2DA8FF",
        },
        primary: "#E6EDF3",
        secondary: "#A6B3C2",
      },
      fontFamily: {
        sora: ["Sora", "sans-serif"],
        sans: ["DM Sans", "sans-serif"],
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.07)",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(46,211,198,0.25)",
        "glow-blue": "0 0 20px rgba(45,168,255,0.25)",
        "card": "0 4px 24px rgba(0,0,0,0.25)",
        "card-hover": "0 10px 32px rgba(0,0,0,0.35)",
      },
      keyframes: {
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 6px rgba(46,211,198,0.6)" },
          "50%": { boxShadow: "0 0 14px rgba(46,211,198,0.9)" },
        },
        progressFill: {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-target)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeSlideUp: "fadeSlideUp 0.45s ease both",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
        countUp: "countUp 0.5s ease both",
      },
    },
  },
  plugins: [],
};

export default config;
