"use client";

/**
 * MatchingSentenceEndingsQuestion — dropdown per sentence start.
 *
 * IELTS computer-delivered uses dropdowns here (more endings than starts —
 * distractors), and a select control matches that experience. Each start
 * gets a dropdown listing all ending letters + their text.
 *
 * Answer format: JSON.stringify({ [start_id]: ending_letter, ... }).
 */

import { useMemo } from "react";

interface SentenceStart { id: string; text: string }
interface Ending { letter: string; text: string }

interface Payload {
  sentence_starts: SentenceStart[];
  endings: Ending[];
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

export default function MatchingSentenceEndingsQuestion({ options, answer, onAnswer }: Props) {
  const payload = options as Payload | null;
  const starts = payload?.sentence_starts ?? [];
  const endings = payload?.endings ?? [];
  const mapping = useMemo(() => parseMapping(answer), [answer]);

  if (!starts.length || !endings.length) return null;

  const update = (id: string, letter: string) => {
    const next = { ...mapping };
    if (letter) next[id] = letter;
    else delete next[id];
    onAnswer(JSON.stringify(next));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg p-3" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
        <div className="text-xs font-semibold mb-2 uppercase" style={{ color: "var(--color-text-tertiary)" }}>Endings</div>
        <ol className="space-y-1 text-sm" style={{ color: "var(--color-text)" }}>
          {endings.map((e) => (
            <li key={e.letter}>
              <span className="font-semibold mr-2" style={{ color: "#00A896" }}>{e.letter}.</span>
              {e.text}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        {starts.map((s) => {
          const sel = mapping[s.id] ?? "";
          return (
            <div key={s.id} className="flex flex-col gap-1.5">
              <p className="text-sm" style={{ color: "var(--color-text)", fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {s.text}
              </p>
              <select
                value={sel}
                onChange={(ev) => update(s.id, ev.target.value)}
                className="rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: `1px solid ${sel ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                  color: "var(--color-text)",
                }}
                aria-label={`Chọn phần kết cho "${s.text}"`}
              >
                <option value="">— Chọn ending —</option>
                {endings.map((e) => (
                  <option key={e.letter} value={e.letter}>
                    {e.letter}. {e.text}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
