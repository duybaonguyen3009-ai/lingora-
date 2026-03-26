/**
 * GrammarAmbient.tsx
 *
 * Ambient background overlays for Grammar lesson/exam screens.
 * Adds depth through soft radial glows — purely decorative.
 * Renders as fixed position behind content.
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
      {/* Top-left indigo glow */}
      <div
        className="absolute"
        style={{
          top: "-15%",
          left: "-10%",
          width: "55%",
          height: "55%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(99,102,241,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* Bottom-right teal glow */}
      <div
        className="absolute"
        style={{
          bottom: "-10%",
          right: "-8%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(46,211,198,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* Center subtle violet accent */}
      <div
        className="absolute"
        style={{
          top: "30%",
          left: "40%",
          width: "30%",
          height: "30%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(139,92,246,0.04) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}

/**
 * Elevated card style props for grammar exercise cards.
 * Use as spread: style={GRAMMAR_CARD_STYLE}
 */
export const GRAMMAR_CARD_STYLE: React.CSSProperties = {
  border: "1px solid rgba(139,92,246,0.12)",
  background: "color-mix(in srgb, var(--color-bg-card) 92%, rgba(139,92,246,0.06))",
  boxShadow:
    "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.04)",
};
