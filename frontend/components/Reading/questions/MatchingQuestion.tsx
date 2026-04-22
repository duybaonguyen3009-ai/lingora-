"use client";

/**
 * MatchingQuestion — single-pick from N labelled options.
 *
 * Schema in DB is essentially MCQ: options = { A: "...", B: "...", ... }
 * and correct_answer = a single letter. The legacy renderer used pill
 * buttons (dropdown-style click). We now default to drag-drop to match
 * the IELTS CBT feel, with `renderAs="dropdown"` available as a fallback
 * for callers that prefer the old UX.
 *
 * Drag-drop variant: option chips sit in a tray; below is a single drop
 * slot. Drop a chip into the slot to commit the answer; click the
 * filled slot to clear.
 *
 * Real multi-item matching (information / features / endings / headings)
 * lives in dedicated batch-2 components. Don't reach for this one for
 * those payloads.
 */

import { DragEvent } from "react";

interface Props {
  q: { options: Record<string, unknown> | null };
  answer: string;
  onAnswer: (a: string) => void;
  renderAs?: "dropdown" | "dragdrop";
}

export default function MatchingQuestion({ q, answer, onAnswer, renderAs = "dragdrop" }: Props) {
  if (!q.options) return null;
  const entries = Object.entries(q.options);

  if (renderAs === "dropdown") return <DropdownVariant entries={entries} answer={answer} onAnswer={onAnswer} />;
  return <DragDropVariant entries={entries} answer={answer} onAnswer={onAnswer} />;
}

function DropdownVariant({
  entries,
  answer,
  onAnswer,
}: {
  entries: [string, unknown][];
  answer: string;
  onAnswer: (a: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs mb-1" style={{ color: answer ? "#00A896" : "var(--color-text-tertiary)" }}>
        {answer ? `Đã chọn: ${answer}` : "Chọn đáp án phù hợp"}
      </div>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: entries.length <= 5 ? "repeat(auto-fill, minmax(100%, 1fr))" : "repeat(auto-fill, minmax(48%, 1fr))",
        }}
      >
        {entries.map(([key, text]) => {
          const selected = answer === key;
          return (
            <button
              key={key}
              onClick={() => onAnswer(selected ? "" : key)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm transition-all active:scale-[0.97]"
              style={{
                background: selected ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
                border: `1px solid ${selected ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                color: "var(--color-text)",
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{
                  background: selected ? "#00A896" : "var(--color-border)",
                  color: selected ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {key}
              </span>
              <span className="flex-1 line-clamp-2">{String(text)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DragDropVariant({
  entries,
  answer,
  onAnswer,
}: {
  entries: [string, unknown][];
  answer: string;
  onAnswer: (a: string) => void;
}) {
  const onDragStart = (ev: DragEvent<HTMLDivElement>, key: string) => {
    ev.dataTransfer.setData("text/plain", key);
    ev.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  };
  const onDrop = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const key = ev.dataTransfer.getData("text/plain");
    if (key) onAnswer(key);
  };

  const selectedEntry = entries.find(([k]) => k === answer);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-lg p-3"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
      >
        <div className="text-xs font-semibold mb-2 uppercase" style={{ color: "var(--color-text-tertiary)" }}>
          Choices (kéo vào ô bên dưới)
        </div>
        <div className="flex flex-wrap gap-2">
          {entries.map(([key, text]) => (
            <div
              key={key}
              draggable
              onDragStart={(e) => onDragStart(e, key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-grab active:cursor-grabbing select-none"
              style={{
                background: answer === key ? "rgba(0,168,150,0.12)" : "var(--color-bg-card)",
                border: `1px solid ${answer === key ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                color: "var(--color-text)",
                opacity: answer === key ? 0.5 : 1,
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}
              >
                {key}
              </span>
              <span className="line-clamp-1">{String(text)}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => answer && onAnswer("")}
        role="button"
        tabIndex={0}
        aria-label={answer ? "Đáp án đã chọn (bấm để xoá)" : "Kéo đáp án vào đây"}
        className="rounded-lg p-3 min-h-[3.5rem] flex items-center justify-center cursor-pointer"
        style={{
          background: answer ? "rgba(0,168,150,0.06)" : "var(--color-bg-secondary)",
          border: `1px dashed ${answer ? "rgba(0,168,150,0.5)" : "var(--color-border)"}`,
        }}
      >
        {selectedEntry ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
            <span
              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold"
              style={{ background: "#00A896", color: "#fff" }}
            >
              {selectedEntry[0]}
            </span>
            <span>{String(selectedEntry[1])}</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            Kéo một đáp án vào đây
          </span>
        )}
      </div>
    </div>
  );
}
