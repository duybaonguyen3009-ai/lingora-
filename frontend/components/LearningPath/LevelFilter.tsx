"use client";

import { useState } from "react";

export function LevelFilter({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const levels = ["All", "B1", "B2", "C1"];
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ backgroundColor: "var(--color-primary-soft)", border: "1px solid var(--color-border)" }}>
      {levels.map((lv) => (
        <button
          key={lv}
          onClick={() => onChange(lv)}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-normal border border-transparent"
          style={
            active === lv
              ? { backgroundColor: "rgba(46,211,198,0.15)", color: "var(--color-success)", borderColor: "rgba(46,211,198,0.25)" }
              : { color: "var(--color-text-secondary)" }
          }
          onMouseEnter={(e) => {
            if (active !== lv) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-primary-soft)";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== lv) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }
          }}
        >
          {lv}
        </button>
      ))}
    </div>
  );
}
