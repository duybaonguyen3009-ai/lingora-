"use client";

/**
 * AnimatedBackground.tsx
 *
 * CSS-only animated gradient blobs that float behind page content.
 * Pure CSS animations (keyframes), no JS animation loop — battery-friendly.
 *
 * Variants:
 *  - "expressive" (home) — 3 blobs, center glow, full motion
 *  - "subtle" (speak/practice) — 2 blobs, reduced opacity
 *  - "minimal" (exam) — 1 blob, very low opacity, barely visible
 *  - "none" — renders nothing
 */

interface AnimatedBackgroundProps {
  variant?: "expressive" | "subtle" | "minimal" | "none";
  /** Show center glow behind the main content area */
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
      {/* Blob 1 — top-right purple */}
      <div className="animated-blob blob-1" />

      {/* Blob 2 — bottom-left blue (hidden on minimal) */}
      {variant !== "minimal" && (
        <div className="animated-blob blob-2" />
      )}

      {/* Blob 3 — center-right green (only on expressive) */}
      {variant === "expressive" && (
        <div className="animated-blob blob-3" />
      )}

      {/* Center glow — soft halo behind speaking card */}
      {centerGlow && <div className="center-glow" />}
    </div>
  );
}
