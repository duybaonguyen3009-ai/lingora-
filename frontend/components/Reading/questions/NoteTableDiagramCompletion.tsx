"use client";

/**
 * NoteTableDiagramCompletion — three formats branch off payload.format.
 *
 *   note    : structure = string with {{bN}} markers (rendered like
 *             SummaryCompletion without_bank).
 *   table   : structure = { rows: string[][] }; cells whose text contains
 *             "{{bN}}" become inputs (each cell holds at most one blank).
 *   diagram : structure = { image_url, caption? }; image is shown above and
 *             blanks rendered as a numbered list of inputs below. We don't
 *             yet support overlay positioning — deferred complexity.
 *
 * Per-blank "No more than N words" instruction shown above each input plus
 * a live counter (red on overflow). Backend also enforces.
 *
 * Answer format: JSON.stringify({ [blank_id]: text, ... }).
 */

import { ChangeEvent, useMemo } from "react";
import { countWords } from "@/lib/wordCount";

interface Blank { id: string; max_words: number }

interface Payload {
  format: "note" | "table" | "diagram";
  structure: unknown;
  blanks: Blank[];
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

const BLANK_RE = /\{\{([^}]+)\}\}/;
const BLANK_RE_GLOBAL = /\{\{([^}]+)\}\}/g;

export default function NoteTableDiagramCompletion({ options, answer, onAnswer }: Props) {
  const payload = options as Payload | null;
  const values = useMemo(() => parseAnswer(answer), [answer]);
  const blanksById = useMemo(() => {
    const m: Record<string, Blank> = {};
    for (const b of payload?.blanks ?? []) m[b.id] = b;
    return m;
  }, [payload?.blanks]);

  if (!payload) return null;

  const write = (id: string, text: string) => {
    const next = { ...values, [id]: text };
    if (!text) delete next[id];
    onAnswer(JSON.stringify(next));
  };

  const InlineBlankInput = ({ id }: { id: string }) => {
    const b = blanksById[id];
    const v = values[id] ?? "";
    const overLimit = b ? countWords(v) > b.max_words : false;
    return (
      <input
        type="text"
        value={v}
        onChange={(e: ChangeEvent<HTMLInputElement>) => write(id, e.target.value)}
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

  // Tokenise a string with {{bN}} markers into text + inline-blank segments.
  const renderInline = (text: string) => {
    const parts: Array<{ kind: "text"; text: string } | { kind: "blank"; id: string }> = [];
    let last = 0;
    let m: RegExpExecArray | null;
    BLANK_RE_GLOBAL.lastIndex = 0;
    while ((m = BLANK_RE_GLOBAL.exec(text)) !== null) {
      if (m.index > last) parts.push({ kind: "text", text: text.slice(last, m.index) });
      parts.push({ kind: "blank", id: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
    return parts.map((p, i) =>
      p.kind === "text"
        ? <span key={`t-${i}`}>{p.text}</span>
        : <InlineBlankInput key={`b-${p.id}-${i}`} id={p.id} />
    );
  };

  // ── note ─────────────────────────────────────────────────────────────
  if (payload.format === "note") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm leading-[2]" style={{ color: "var(--color-text)", fontFamily: 'Georgia, "Times New Roman", serif' }}>
          {renderInline(String(payload.structure ?? ""))}
        </p>
        <BlanksLegend blanks={payload.blanks ?? []} values={values} />
      </div>
    );
  }

  // ── table ────────────────────────────────────────────────────────────
  if (payload.format === "table") {
    const rows = ((payload.structure as { rows?: string[][] } | null)?.rows) ?? [];
    return (
      <div className="flex flex-col gap-2">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse" style={{ color: "var(--color-text)", fontFamily: 'Georgia, "Times New Roman", serif' }}>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-2 py-1 align-top"
                      style={{ border: "1px solid var(--color-border)" }}
                    >
                      {BLANK_RE.test(cell) ? renderInline(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <BlanksLegend blanks={payload.blanks ?? []} values={values} />
      </div>
    );
  }

  // ── diagram ──────────────────────────────────────────────────────────
  const dia = payload.structure as { image_url?: string; caption?: string } | null;
  return (
    <div className="flex flex-col gap-3">
      {dia?.image_url && (
        <figure className="flex flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dia.image_url} alt={dia.caption ?? "Diagram"} className="max-w-full rounded-lg" />
          {dia.caption && (
            <figcaption className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {dia.caption}
            </figcaption>
          )}
        </figure>
      )}
      <div className="flex flex-col gap-2">
        {(payload.blanks ?? []).map((b) => (
          <div key={b.id} className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ background: "rgba(0,168,150,0.12)", color: "#00A896" }}
            >
              {b.id}
            </div>
            <InlineBlankInput id={b.id} />
            <span className="text-[10px] uppercase font-bold" style={{ color: "var(--color-text-tertiary)" }}>
              ≤ {b.max_words} từ
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BlanksLegend({ blanks, values }: { blanks: Blank[]; values: Record<string, string> }) {
  if (!blanks.length) return null;
  return (
    <div className="text-[11px] font-mono" style={{ color: "var(--color-text-tertiary)" }}>
      {blanks.map((b) => {
        const c = countWords(values[b.id]);
        const over = c > b.max_words;
        return (
          <span key={b.id} className="mr-3" style={{ color: over ? "#EF4444" : undefined }}>
            {b.id}: {c}/{b.max_words}
          </span>
        );
      })}
    </div>
  );
}
