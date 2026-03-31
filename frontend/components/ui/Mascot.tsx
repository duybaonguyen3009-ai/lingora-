"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Mascot — Lingona's Lintopus character
   ══════════════════════════════════════════════════════════════════════
   Usage:
     <Mascot size={80} />
     <Mascot size={120} mood="happy" />
     <Mascot size={48} className="opacity-60" />
   ══════════════════════════════════════════════════════════════════════ */

export type MascotMood = "default" | "happy" | "thinking" | "sad";

interface MascotProps {
  /** Size in pixels (width & height) */
  size?: number;
  /** Mood affects future animations/variants */
  mood?: MascotMood;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
  /** Alt text for accessibility */
  alt?: string;
}

const Mascot: React.FC<MascotProps> = ({
  size = 80,
  mood = "default",
  className = "",
  style,
  alt = "Lingona mascot",
}) => {
  return (
    <img
      src="/mascot.svg"
      alt={alt}
      width={size}
      height={size}
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        ...style,
      }}
      draggable={false}
      data-mood={mood}
    />
  );
};

export default Mascot;
