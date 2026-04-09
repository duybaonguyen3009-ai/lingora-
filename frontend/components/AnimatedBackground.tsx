"use client";

/**
 * AnimatedBackground.tsx
 *
 * Lingona signature background — soundwave-inspired ambient visuals.
 * Uses the brand purple palette with animated wave ribbons and soft glows.
 * Pure CSS animations — no JS loop, battery-friendly.
 *
 * Variants:
 *  - "expressive" (home) — dual wave ribbons + brand glow + ambient pulse
 *  - "subtle" (speak/practice) — single wave ribbon + soft glow
 *  - "minimal" (exam) — faint top glow only — exam-appropriate calm
 *  - "none" — renders nothing
 */

interface AnimatedBackgroundProps {
  variant?: "expressive" | "subtle" | "minimal" | "none";
  centerGlow?: boolean;
}

export default function AnimatedBackground({
  variant = "expressive",
  centerGlow = false,
}: AnimatedBackgroundProps) {
  if (variant === "none") return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      aria-hidden="true"
    >
      {/* Primary brand glow — top-right corner */}
      <div className="lingona-glow lingona-glow-primary" />

      {/* Secondary accent glow (subtle + expressive only) */}
      {variant !== "minimal" && (
        <div className="lingona-glow lingona-glow-accent" />
      )}

      {/* Wave ribbon 1 — flowing horizontal wave */}
      {variant !== "minimal" && (
        <div className="lingona-wave lingona-wave-1">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,60 C200,20 400,100 600,60 C800,20 1000,100 1200,60"
              fill="none"
              stroke="url(#waveGrad1)"
              strokeWidth="1.5"
              className="lingona-wave-path"
            />
            <defs>
              <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,168,150,0)" />
                <stop offset="30%" stopColor="rgba(0,168,150,0.15)" />
                <stop offset="70%" stopColor="rgba(56,189,248,0.10)" />
                <stop offset="100%" stopColor="rgba(56,189,248,0)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Wave ribbon 2 — second wave (expressive only) */}
      {variant === "expressive" && (
        <div className="lingona-wave lingona-wave-2">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,80 C150,40 350,100 550,60 C750,20 950,90 1200,50"
              fill="none"
              stroke="url(#waveGrad2)"
              strokeWidth="1"
              className="lingona-wave-path"
            />
            <defs>
              <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(52,211,153,0)" />
                <stop offset="40%" stopColor="rgba(52,211,153,0.08)" />
                <stop offset="80%" stopColor="rgba(0,168,150,0.06)" />
                <stop offset="100%" stopColor="rgba(0,168,150,0)" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      )}

      {/* Ambient pulse — breathing glow behind main content */}
      {centerGlow && <div className="lingona-pulse" />}
    </div>
  );
}
