"use client";

/**
 * ShortAnswerQuestion — text input per sub-question.
 *
 * Mirrors SentenceCompletion structure but with explicit question text rather
 * than a sentence-with-blank. "NO MORE THAN N WORDS" instruction above each
 * input plus a live word counter.
 *
 * Answer format: JSON.stringify({ [question_id]: text, ... }).
 */

import { useMemo } from "react";
import { countWords } from "@/lib/wordCount";

interface SubQuestion {
  id: string;
  question_text: string;
  max_words: number;
}

interface Payload {
  questions: SubQuestion[];
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

export default function ShortAnswerQuestion({ options, answer, onAnswer }: Props) {
  const payload = options as Payload | null;
  const items = payload?.questions ?? [];
  const values = useMemo(() => parseAnswer(answer), [answer]);

  if (!items.length) return null;

  const update = (id: string, text: string) => {
    const next = { ...values, [id]: text };
    if (!text) delete next[id];
    onAnswer(JSON.stringify(next));
  };

  return (
    <div className="flex flex-col gap-4">
      {items.map((it) => {
        const v = values[it.id] ?? "";
        const count = countWords(v);
        const overLimit = count > it.max_words;
        return (
          <div key={it.id} className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "var(--color-text-tertiary)" }}>
              No more than {it.max_words} {it.max_words === 1 ? "word" : "words"}
            </div>
            <p className="text-sm" style={{ color: "var(--color-text)", fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {it.question_text}
            </p>
            <input
              type="text"
              value={v}
              onChange={(e) => update(it.id, e.target.value)}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              aria-invalid={overLimit}
              className="rounded-lg px-3 py-2 text-sm"
              style={{
                background: "var(--color-bg-secondary)",
                border: `1px solid ${overLimit ? "#EF4444" : v ? "rgba(0,168,150,0.4)" : "var(--color-border)"}`,
                color: "var(--color-text)",
              }}
            />
            <div className="text-[11px] font-mono" style={{ color: overLimit ? "#EF4444" : "var(--color-text-tertiary)" }}>
              {count}/{it.max_words} words
            </div>
          </div>
        );
      })}
    </div>
  );
}
