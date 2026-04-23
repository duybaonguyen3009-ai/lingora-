"use client";

/**
 * WritingParaphraseChips — clickable pills of words/phrases the user
 * overused or could swap for more varied academic alternatives.
 *
 * Each chip expands inline into an accordion card showing alternatives
 * as copy-able pills plus the AI's "when to use which" context note.
 * Only one chip is expanded at a time — tapping another collapses the
 * previous. Tapping the already-open chip closes it.
 *
 * Silently hides itself when suggestions is empty or missing so it
 * never leaves an empty header on the page.
 */

import { useState } from "react";
import type { ParaphraseSuggestion } from "@/lib/types";

interface WritingParaphraseChipsProps {
  suggestions: ParaphraseSuggestion[] | undefined;
}

export default function WritingParaphraseChips({ suggestions }: WritingParaphraseChipsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const list = (suggestions ?? []).filter((s) => s?.phrase && Array.isArray(s.alternatives) && s.alternatives.length > 0);
  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
        Gợi ý từ / cụm từ thay thế
      </div>
      <div className="flex flex-wrap gap-2">
        {list.map((s, i) => {
          const open = openIndex === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              aria-expanded={open}
              title={s.alternatives.slice(0, 3).join(" · ")}
              className="text-sm px-3 py-1.5 rounded-full transition-all cursor-pointer"
              style={{
                background: open ? "rgba(126,78,193,0.12)" : "var(--color-bg-secondary)",
                color: open ? "#7E4EC1" : "var(--color-text)",
                border: `1px solid ${open ? "rgba(126,78,193,0.35)" : "var(--color-border)"}`,
              }}
            >
              {s.phrase}
            </button>
          );
        })}
      </div>

      {openIndex !== null && list[openIndex] && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              “{list[openIndex].phrase}”
            </div>
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              className="text-xs"
              style={{ color: "var(--color-text-tertiary)" }}
              aria-label="Đóng"
            >
              Đóng
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {list[openIndex].alternatives.map((alt, j) => (
              <span
                key={j}
                className="text-sm px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(0,168,150,0.10)",
                  color: "#00A896",
                  border: "1px solid rgba(0,168,150,0.25)",
                }}
              >
                {alt}
              </span>
            ))}
          </div>

          {list[openIndex].context && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {list[openIndex].context}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
