"use client";

/**
 * WritingParagraphIcons — splits the essay on blank lines and, for each
 * paragraph, floats a stack of icons alongside it. Each icon represents
 * one signal the AI flagged on the paragraph (coherence, band_upgrade,
 * good_structure, task_response, lexical_highlight). Clicking any icon
 * on a paragraph opens the shared drawer with the full
 * ParagraphAnalysis for that paragraph.
 *
 * Desktop: icons pinned to the right of each paragraph block.
 * Mobile : icons wrap above the paragraph as a horizontal pill row.
 */

import type { ParagraphAnalysis, ParagraphIcon, ParagraphIconType } from "@/lib/types";

interface WritingParagraphIconsProps {
  essayText: string;
  paragraphs: ParagraphAnalysis[];
  onParagraphClick: (paragraphNumber: number) => void;
}

function iconEmoji(type: ParagraphIconType): string {
  switch (type) {
    case "coherence":           return "⚠️";
    case "band_upgrade":        return "💡";
    case "good_structure":      return "✅";
    case "task_response":       return "🎯";
    case "lexical_highlight":   return "💎";
  }
}

function iconColor(type: ParagraphIconType): string {
  switch (type) {
    case "coherence":           return "#F07167";
    case "band_upgrade":        return "#F9A826";
    case "good_structure":      return "#00A896";
    case "task_response":       return "#1B2B4B";
    case "lexical_highlight":   return "#7E4EC1";
  }
}

function iconLabel(type: ParagraphIconType): string {
  switch (type) {
    case "coherence":           return "Liên kết";
    case "band_upgrade":        return "Nâng band";
    case "good_structure":      return "Cấu trúc tốt";
    case "task_response":       return "Bám đề";
    case "lexical_highlight":   return "Từ vựng";
  }
}

function splitParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

interface IconPillProps {
  icon: ParagraphIcon;
  onClick: () => void;
}

function IconPill({ icon, onClick }: IconPillProps) {
  const color = iconColor(icon.type);
  return (
    <button
      type="button"
      onClick={onClick}
      title={icon.note}
      aria-label={`${iconLabel(icon.type)} — ${icon.note}`}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all hover:scale-105 cursor-pointer shrink-0"
      style={{
        background: `${color}12`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="text-sm leading-none">{iconEmoji(icon.type)}</span>
      <span className="hidden md:inline">{iconLabel(icon.type)}</span>
    </button>
  );
}

export default function WritingParagraphIcons({
  essayText,
  paragraphs,
  onParagraphClick,
}: WritingParagraphIconsProps) {
  const blocks = splitParagraphs(essayText);
  // Match by index (1-based paragraph_number) — most reliable since both
  // come from the same submitted essay split on blank lines.
  const byNumber = new Map<number, ParagraphAnalysis>();
  for (const p of paragraphs ?? []) {
    if (p && typeof p.paragraph_number === "number") byNumber.set(p.paragraph_number, p);
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, i) => {
        const paraNum = i + 1;
        const para = byNumber.get(paraNum);
        const icons = (para?.icons ?? []).filter(Boolean);

        return (
          <div key={paraNum} className="flex flex-col md:flex-row md:items-start gap-3">
            {/* Mobile: icons above the paragraph as a wrap row */}
            {icons.length > 0 && (
              <div className="flex flex-wrap gap-2 md:hidden">
                {icons.map((icon, idx) => (
                  <IconPill key={idx} icon={icon} onClick={() => onParagraphClick(paraNum)} />
                ))}
              </div>
            )}

            <div
              className="flex-1 rounded-lg px-4 py-3 text-sm leading-[1.9] whitespace-pre-wrap"
              style={{
                background: "var(--surface-primary)",
                border: "1px solid var(--surface-border)",
                color: "var(--color-text)",
              }}
            >
              {block}
            </div>

            {/* Desktop: icons pinned to the right column */}
            {icons.length > 0 && (
              <div className="hidden md:flex flex-col gap-1.5 w-36 shrink-0 pt-1">
                {icons.map((icon, idx) => (
                  <IconPill key={idx} icon={icon} onClick={() => onParagraphClick(paraNum)} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
