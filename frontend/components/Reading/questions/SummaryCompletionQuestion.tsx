"use client";

/**
 * SummaryCompletionQuestion — renders a summary paragraph with inline blanks.
 *
 * with_bank mode: each word_bank chip is HTML5-draggable; each blank is a
 *   drop target. Each chip is single-use: once placed in a blank, the chip
 *   in the bank is greyed out and non-draggable. Clearing the blank (click
 *   the filled slot) restores that chip. If the bank lists the same word
 *   twice (rare but allowed), the chips are tracked positionally — the
 *   first N instances are marked used where N is how many blanks contain
 *   that word.
 * without_bank mode: inline text inputs with live "No more than N words"
 *   counter, mirroring SentenceCompletion.
 *
 * Blank tokens in summary_text_with_blanks look like {{b1}} {{b2}} and map
 * to entries in payload.blanks.
 *
 * Answer format: JSON.stringify({ [blankId]: text, ... }).
 */

import { DragEvent, useMemo } from "react";
import { countWords } from "@/lib/wordCount";

interface Blank {
  id: string;
  max_words: number;
  // correct_answers unused in UI
}

interface Payload {
  summary_text_with_blanks: string;
  word_bank?: string[];
  blanks: Blank[];
  mode: "with_bank" | "without_bank";
}

interface Props {
  options: unknown;
  answer: string;
  onAnswer: (a: string) => void;
}

function parseAnswer(answer: string): Record<string, string> {
  try {
    const v = JSON.parse(answer);
    return v && typeof v === "object" ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

type Segment = { kind: "text"; text: string } | { kind: "blank"; id: string };

function tokenize(text: string): Segment[] {
  const re = /\{\{([^}]+)\}\}/g;
  const segs: Segment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: "text", text: text.slice(last, m.index) });
    segs.push({ kind: "blank", id: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ kind: "text", text: text.slice(last) });
  return segs;
}

export default function SummaryCompletionQuestion({ options, answer, onAnswer }: Props) {
  const payload = options as Payload | null;
  if (!payload) return null;

  const values = useMemo(() => parseAnswer(answer), [answer]);
  const segments = useMemo(() => tokenize(payload.summary_text_with_blanks ?? ""), [payload.summary_text_with_blanks]);
  const blanksById = useMemo(() => {
    const m: Record<string, Blank> = {};
    for (const b of payload.blanks ?? []) m[b.id] = b;
    return m;
  }, [payload.blanks]);

  // One-use word bank: walk the bank left-to-right, mark the first N
  // chips of each word as "used" where N is how many blanks currently
  // hold that word. Repeated words in the bank are tracked positionally
  // so a 2x-listed word can be used twice.
  const chipUsed = useMemo(() => {
    const bank = payload.word_bank ?? [];
    const usageByWord: Record<string, number> = {};
    for (const v of Object.values(values)) {
      if (v) usageByWord[v] = (usageByWord[v] || 0) + 1;
    }
    const consumed: Record<string, number> = {};
    return bank.map((w) => {
      const cap = usageByWord[w] || 0;
      const taken = consumed[w] || 0;
      if (taken < cap) {
        consumed[w] = taken + 1;
        return true;
      }
      return false;
    });
  }, [payload.word_bank, values]);

  const write = (id: string, text: string) => {
    const next = { ...values, [id]: text };
    if (!text) delete next[id];
    onAnswer(JSON.stringify(next));
  };

  const onDragStart = (ev: DragEvent<HTMLSpanElement>, word: string) => {
    ev.dataTransfer.setData("text/plain", word);
    ev.dataTransfer.effectAllowed = "copy";
  };
  const onDragOver = (ev: DragEvent<HTMLSpanElement>) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
  };
  const onDrop = (ev: DragEvent<HTMLSpanElement>, blankId: string) => {
    ev.preventDefault();
    const word = ev.dataTransfer.getData("text/plain");
    if (word) write(blankId, word);
  };

  const isWithBank = payload.mode === "with_bank" && (payload.word_bank?.length ?? 0) > 0;

  const renderBlank = (id: string) => {
    const b = blanksById[id];
    const v = values[id] ?? "";

    if (isWithBank) {
      return (
        <span
          key={`blank-${id}`}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, id)}
          onClick={() => v && write(id, "")}
          role="button"
          tabIndex={0}
          aria-label={v ? `Đã điền "${v}". Bấm để xoá.` : "Kéo từ vào ô này"}
          className="inline-flex items-center mx-1 px-2 py-0.5 rounded-md align-baseline cursor-pointer select-none"
          style={{
            minWidth: "5rem",
            background: v ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
            border: `1px dashed ${v ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
            color: v ? "#00A896" : "var(--color-text-tertiary)",
          }}
        >
          {v || "____"}
        </span>
      );
    }

    const count = countWords(v);
    const overLimit = b ? count > b.max_words : false;
    return (
      <input
        key={`blank-${id}`}
        type="text"
        value={v}
        onChange={(e) => write(id, e.target.value)}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        aria-invalid={overLimit}
        aria-label={`Ô trống ${id}${b ? `, tối đa ${b.max_words} từ` : ""}`}
        className="mx-1 rounded-md px-2 py-0.5 text-sm align-baseline"
        style={{
          minWidth: "6rem",
          background: "var(--color-bg-secondary)",
          border: `1px solid ${overLimit ? "#EF4444" : v ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
          color: "var(--color-text)",
        }}
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {isWithBank && (
        <div className="rounded-lg p-3" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
          <div className="text-xs font-semibold mb-2 uppercase" style={{ color: "var(--color-text-tertiary)" }}>Word bank</div>
          <div className="flex flex-wrap gap-2">
            {(payload.word_bank ?? []).map((w, i) => {
              const used = chipUsed[i];
              return (
                <span
                  key={`${w}-${i}`}
                  draggable={!used}
                  onDragStart={(e) => !used && onDragStart(e, w)}
                  aria-disabled={used}
                  className={`px-2.5 py-1 rounded-md text-sm select-none ${
                    used ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
                  }`}
                  style={{
                    background: "var(--color-bg-card)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                    opacity: used ? 0.4 : 1,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-sm leading-[2]" style={{ color: "var(--color-text)", fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {segments.map((seg, i) =>
          seg.kind === "text" ? <span key={`t-${i}`}>{seg.text}</span> : renderBlank(seg.id),
        )}
      </p>

      {!isWithBank && (
        <div className="text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
          {payload.blanks?.map((b) => {
            const c = countWords(values[b.id]);
            const over = c > b.max_words;
            return (
              <span key={b.id} className="mr-3" style={{ color: over ? "#EF4444" : undefined }}>
                {b.id}: {c}/{b.max_words}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
