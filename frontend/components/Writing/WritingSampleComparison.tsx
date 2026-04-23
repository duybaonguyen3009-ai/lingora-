"use client";

/**
 * WritingSampleComparison — side-by-side reading of the student's essay
 * against the AI-provided band 7+ sample answer.
 *
 * Layout:
 *   - Desktop: two 50/50 columns with independent scroll panes.
 *   - Mobile : stacked; each column scrolls its own content.
 *
 * Synced scroll: the "Cuộn đồng bộ" toggle mirrors the scrollTop ratio
 * from whichever pane the user scrolled onto the other pane. Disabled
 * by default so reading feels natural.
 *
 * Paragraph count diff: if the student has fewer paragraphs than the
 * sample, their column gets a subtle amber tint — small nudge that the
 * sample is better-structured.
 */

import { useEffect, useRef, useState } from "react";

interface WritingSampleComparisonProps {
  userEssay: string;
  sampleAnswer: string;
  userBand?: number | null;
}

function countParagraphs(text: string): number {
  return text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).length;
}

export default function WritingSampleComparison({
  userEssay,
  sampleAnswer,
  userBand,
}: WritingSampleComparisonProps) {
  const [syncScroll, setSyncScroll] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  // Guard so a programmatic scroll doesn't re-trigger the other side.
  const mirroring = useRef(false);

  const userParas = countParagraphs(userEssay);
  const sampleParas = countParagraphs(sampleAnswer);
  const userIsLight = syncScroll ? false : userParas < sampleParas && sampleParas > 0;

  useEffect(() => {
    if (!syncScroll) return;
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const mirror = (source: HTMLDivElement, target: HTMLDivElement) => {
      if (mirroring.current) return;
      const maxSrc = source.scrollHeight - source.clientHeight;
      const maxTgt = target.scrollHeight - target.clientHeight;
      if (maxSrc <= 0 || maxTgt <= 0) return;
      mirroring.current = true;
      target.scrollTop = (source.scrollTop / maxSrc) * maxTgt;
      requestAnimationFrame(() => { mirroring.current = false; });
    };
    const onLeft  = () => mirror(left, right);
    const onRight = () => mirror(right, left);
    left.addEventListener("scroll", onLeft);
    right.addEventListener("scroll", onRight);
    return () => {
      left.removeEventListener("scroll", onLeft);
      right.removeEventListener("scroll", onRight);
    };
  }, [syncScroll]);

  return (
    <div className="flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          Bạn có {userParas} đoạn · mẫu có {sampleParas} đoạn
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--color-text-secondary)" }}>
          <input
            type="checkbox"
            checked={syncScroll}
            onChange={(e) => setSyncScroll(e.target.checked)}
            className="accent-teal-600"
          />
          Cuộn đồng bộ
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left — user essay */}
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{
            background: userIsLight ? "rgba(249,168,38,0.06)" : "var(--surface-primary)",
            border: `1px solid ${userIsLight ? "rgba(249,168,38,0.35)" : "var(--surface-border)"}`,
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
                Bài của bạn
              </div>
              {typeof userBand === "number" && (
                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Band {userBand.toFixed(1)}
                </div>
              )}
            </div>
            {userIsLight && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
                style={{ background: "rgba(249,168,38,0.14)", color: "#B07400" }}
              >
                Ít đoạn hơn mẫu
              </span>
            )}
          </div>
          <div
            ref={leftRef}
            className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-[1.9] whitespace-pre-wrap"
            style={{ color: "var(--color-text)", maxHeight: "60vh", minHeight: 320 }}
          >
            {userEssay || <em style={{ color: "var(--color-text-tertiary)" }}>Không có nội dung.</em>}
          </div>
        </div>

        {/* Right — sample */}
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{
            background: "var(--surface-primary)",
            border: "1px solid var(--surface-border)",
            boxShadow: "var(--surface-shadow)",
          }}
        >
          <div
            className="px-4 py-2.5"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-tertiary)" }}>
              Mẫu band 7+
            </div>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Cấu trúc chuẩn IELTS
            </div>
          </div>
          <div
            ref={rightRef}
            className="flex-1 overflow-y-auto px-4 py-3 text-sm leading-[1.9] whitespace-pre-wrap"
            style={{ color: "var(--color-text)", maxHeight: "60vh", minHeight: 320 }}
          >
            {sampleAnswer || <em style={{ color: "var(--color-text-tertiary)" }}>Không có mẫu.</em>}
          </div>
        </div>
      </div>
    </div>
  );
}
