"use client";

/**
 * MatchingInformationQuestion — drag-drop. Each statement card is dragged
 * into one of the paragraph buckets (A, B, C, ...). The same paragraph may
 * accept multiple statements (real IELTS rule: "you may use any letter more
 * than once"), so paragraph buckets are not consumed.
 *
 * A statement already placed shows in its bucket; dragging it again moves
 * it. Click a placed statement chip in a bucket to remove it back to the
 * unplaced tray.
 *
 * Answer format: JSON.stringify({ [statement_id]: paragraph_label, ... }).
 */

import { DragEvent, useMemo } from "react";

interface Statement {
  id: string;
  text: string;
}

interface Payload {
  statements: Statement[];
  paragraph_labels: string[];
  // correct_mapping not used by the UI
}

interface Props {
  options: unknown;
  answer: string;
  onAnswer: (a: string) => void;
}

function parseMapping(answer: string): Record<string, string> {
  try {
    const v = JSON.parse(answer);
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export default function MatchingInformationQuestion({ options, answer, onAnswer }: Props) {
  const payload = options as Payload | null;
  const statements = payload?.statements ?? [];
  const labels = payload?.paragraph_labels ?? [];
  const mapping = useMemo(() => parseMapping(answer), [answer]);

  if (!statements.length || !labels.length) return null;

  const placedIn = (label: string) =>
    statements.filter((s) => mapping[s.id] === label);
  const unplaced = statements.filter((s) => !mapping[s.id]);

  const place = (id: string, label: string | null) => {
    const next = { ...mapping };
    if (label) next[id] = label;
    else delete next[id];
    onAnswer(JSON.stringify(next));
  };

  const onDragStart = (ev: DragEvent<HTMLDivElement>, id: string) => {
    ev.dataTransfer.setData("text/plain", id);
    ev.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  };
  const onDropToBucket = (ev: DragEvent<HTMLDivElement>, label: string) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (id) place(id, label);
  };
  const onDropToTray = (ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (id) place(id, null);
  };

  const StatementChip = ({ s, onClickRemove }: { s: Statement; onClickRemove?: () => void }) => (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, s.id)}
      onClick={onClickRemove}
      role={onClickRemove ? "button" : undefined}
      className="rounded-lg px-3 py-2 text-sm cursor-grab active:cursor-grabbing select-none"
      style={{
        background: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text)",
      }}
    >
      {s.text}
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={onDragOver}
        onDrop={onDropToTray}
        className="rounded-lg p-3 min-h-[3rem]"
        style={{ background: "var(--color-bg-secondary)", border: "1px dashed var(--color-border)" }}
      >
        <div className="text-xs font-semibold mb-2 uppercase" style={{ color: "var(--color-text-tertiary)" }}>
          Statements (kéo vào đoạn phù hợp)
        </div>
        {unplaced.length === 0 ? (
          <div className="text-xs italic" style={{ color: "var(--color-text-tertiary)" }}>
            Đã sắp xếp hết.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {unplaced.map((s) => <StatementChip key={s.id} s={s} />)}
          </div>
        )}
      </div>

      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {labels.map((label) => {
          const inBucket = placedIn(label);
          return (
            <div
              key={label}
              onDragOver={onDragOver}
              onDrop={(e) => onDropToBucket(e, label)}
              className="rounded-lg p-2 min-h-[5rem]"
              style={{
                background: "var(--color-bg-secondary)",
                border: `1px dashed ${inBucket.length ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold"
                  style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}
                >
                  {label}
                </div>
                <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {inBucket.length} statement{inBucket.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {inBucket.map((s) => (
                  <StatementChip key={s.id} s={s} onClickRemove={() => place(s.id, null)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
