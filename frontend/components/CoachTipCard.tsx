"use client";

import { useState } from "react";
import { IconX } from "./Icons";
import LingonaLogo from "./LingonaLogo";

const TIPS = [
  "Try speaking for 5 minutes each morning — consistency beats long sessions.",
  "Don't worry about perfect grammar. Focus on being understood first.",
  "Record yourself and listen back — you'll spot patterns you can't hear live.",
  "Practice the sounds that don't exist in Vietnamese, like 'th' and 'r'.",
];

export default function CoachTipCard() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];

  return (
    <div
      className="relative flex items-start gap-3.5 p-5 rounded-2xl"
      style={{
        backgroundColor: "var(--color-primary-soft)",
        border: "1px solid var(--color-border)",
        borderLeft: "3px solid var(--color-primary)",
      }}
    >
      <LingonaLogo size={36} className="flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-[13px] mb-1"
          style={{ color: "var(--color-primary)" }}
        >
          Coach tip
        </p>
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: "var(--color-text)" }}
        >
          {tip}
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-md transition-colors hover:opacity-70"
        style={{ color: "var(--color-text-secondary)" }}
        aria-label="Dismiss tip"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}
