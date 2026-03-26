/**
 * GrammarAmbient.tsx
 *
 * Ambient background overlays for Grammar lesson/exam screens.
 * Adds depth through soft radial glows with slow drift animation.
 * Purely decorative — no interaction or logic.
 */

"use client";

import React from "react";

/**
 * Ambient glow overlay — renders soft gradient orbs behind grammar content.
 * Place as the first child of the fixed lesson/exam wrapper.
 */
export function GrammarAmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Slow-drift keyframes injected via style tag (grammar-scoped) */}
      <style>{`
        @keyframes grammar-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(3%, 4%) scale(1.05); }
        }
        @keyframes grammar-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-4%, -3%) scale(1.03); }
        }
        @keyframes grammar-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(2%, -2%) scale(1.08); opacity: 1; }
        }
      `}</style>

      {/* Top-left indigo glow */}
      <div
        style={{
          position: "absolute",
          top: "-12%",
          left: "-8%",
          width: "55%",
          height: "55%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "grammar-drift-1 12s ease-in-out infinite",
        }}
      />
      {/* Bottom-right teal glow */}
      <div
        style={{
          position: "absolute",
          bottom: "-8%",
          right: "-6%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(46,211,198,0.09) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "grammar-drift-2 15s ease-in-out infinite",
        }}
      />
      {/* Center violet accent */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "40%",
          width: "30%",
          height: "30%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.07) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "grammar-drift-3 18s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/**
 * Elevated card style props for grammar exercise cards.
 */
export const GRAMMAR_CARD_STYLE: React.CSSProperties = {
  border: "1px solid rgba(139,92,246,0.12)",
  background: "color-mix(in srgb, var(--color-bg-card) 92%, rgba(139,92,246,0.06))",
  boxShadow:
    "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
};
