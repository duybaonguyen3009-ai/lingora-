"use client";

/**
 * VocabSection.tsx
 *
 * Interactive vocabulary mini-lesson with multiple exercise types.
 *
 * Flow: Learn → Match → Context → Recall → Results → onContinue()
 *
 * Graceful degradation:
 *  - < 2 items → skip Match
 *  - no items with example_sentence → skip Context
 *  - Minimum path: Learn → Recall → Results
 *
 * Interface contract: { items: ApiVocabItem[], onContinue: () => void }
 * Unchanged from original — LessonModal/index.tsx calls onContinue()
 * to advance to the next step (quiz or speaking).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { ApiVocabItem } from "@/lib/api";
import Button from "@/components/ui/Button";
import useSound from "@/hooks/useSound";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface VocabSectionProps {
  items: ApiVocabItem[];
  onContinue: () => void;
}

type Phase = "learn" | "match" | "context" | "recall" | "results";

interface ExerciseResult {
  word: string;
  meaning: string;
  correct: boolean;
  exerciseType: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/['']/g, "'");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Determine which phases to include based on available data. */
function buildPhaseSequence(items: ApiVocabItem[]): Phase[] {
  const phases: Phase[] = ["learn"];
  if (items.length >= 2) phases.push("match");
  if (items.some((i) => i.example_sentence)) phases.push("context");
  phases.push("recall", "results");
  return phases;
}

// ─── Shared Progress Header ────────────────────────────────────────────────

function ExerciseHeader({
  label,
  labelColor,
  current,
  total,
  progress,
}: {
  label: string;
  labelColor: string;
  current: number;
  total: number;
  progress: number;
}) {
  return (
    <div className="flex flex-col items-center gap-3 mb-5">
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${labelColor}18`, color: labelColor }}
        >
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {current} / {total}
        </span>
      </div>
      <div className="w-full max-w-[360px] h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition duration-slow"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(to right, ${labelColor}, var(--color-accent))`,
          }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 1: LEARN — Expose word + meaning
// ═══════════════════════════════════════════════════════════════════════════

function LearnPhase({
  items,
  onComplete,
}: {
  items: ApiVocabItem[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);
  const current = items[index];
  const isLast = index === items.length - 1;

  return (
    <div className="flex flex-col items-center gap-5">
      <ExerciseHeader
        label="Learn"
        labelColor="#2DA8FF"
        current={index + 1}
        total={items.length}
        progress={((index + 1) / items.length) * 100}
      />

      <div
        className="w-full max-w-[360px] rounded-lg p-6 flex flex-col items-center gap-4 transition duration-normal"
        style={{
          border: showMeaning ? "1px solid rgba(46,211,198,0.25)" : "1px solid var(--color-border)",
          background: "var(--color-bg-card)",
          minHeight: 200,
        }}
      >
        <p className="text-xl font-sora font-bold text-center" style={{ color: "var(--color-text)" }}>
          {current.word}
        </p>
        {current.pronunciation && (
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {current.pronunciation}
          </p>
        )}
        {!showMeaning ? (
          <Button
            variant="soft"
            size="md"
            onClick={() => setShowMeaning(true)}
            className="mt-2"
          >
            Show meaning
          </Button>
        ) : (
          <div className="flex flex-col items-center gap-3 animate-fadeSlideUp">
            <div className="w-10 h-px" style={{ backgroundColor: "var(--color-border)" }} />
            <p className="text-base font-semibold text-center" style={{ color: "var(--color-success)" }}>
              {current.meaning}
            </p>
            {current.example_sentence && (
              <p className="text-xs text-center italic max-w-[280px]" style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}>
                &ldquo;{current.example_sentence}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>

      {showMeaning && (
        <Button
          variant="success"
          size="lg"
          fullWidth
          className="max-w-[360px]"
          onClick={() => {
            if (isLast) { onComplete(); return; }
            setShowMeaning(false);
            setIndex((i) => i + 1);
          }}
          style={isLast ? { background: "linear-gradient(to right, var(--color-success), var(--color-accent))" } : undefined}
        >
          {isLast ? "Start Practice \u2192" : "Got it \u2192"}
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 2: MATCH — Tap word-meaning pairs
// ═══════════════════════════════════════════════════════════════════════════

interface MatchPair { id: string; text: string; type: "word" | "meaning"; itemId: string; }

function MatchPhase({
  items,
  onComplete,
}: {
  items: ApiVocabItem[];
  onComplete: (results: ExerciseResult[]) => void;
}) {
  // Take up to 4 items for matching (8 tiles total)
  const matchItems = useMemo(() => items.slice(0, 4), [items]);

  const tiles = useMemo(() => {
    const pairs: MatchPair[] = [];
    matchItems.forEach((item) => {
      pairs.push({ id: `w-${item.id}`, text: item.word, type: "word", itemId: item.id });
      pairs.push({ id: `m-${item.id}`, text: item.meaning, type: "meaning", itemId: item.id });
    });
    return shuffle(pairs);
  }, [matchItems]);

  const { play } = useSound();
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<[string, string] | null>(null);
  const [results, setResults] = useState<ExerciseResult[]>([]);

  const allMatched = matched.size === tiles.length;
  const progress = (matched.size / tiles.length) * 100;

  function handleTileClick(tile: MatchPair) {
    if (matched.has(tile.id) || wrongPair) return;

    if (!selected) {
      setSelected(tile.id);
      return;
    }

    const first = tiles.find((t) => t.id === selected)!;

    // Must pick one word + one meaning
    if (first.type === tile.type) {
      setSelected(tile.id);
      return;
    }

    if (first.itemId === tile.itemId) {
      // Correct match
      play("correct");
      const newMatched = new Set(matched);
      newMatched.add(first.id);
      newMatched.add(tile.id);
      setMatched(newMatched);
      setSelected(null);
      setResults((prev) => [...prev, {
        word: matchItems.find((i) => i.id === first.itemId)!.word,
        meaning: matchItems.find((i) => i.id === first.itemId)!.meaning,
        correct: true,
        exerciseType: "match",
      }]);
    } else {
      // Wrong match — flash red briefly
      play("wrong");
      setWrongPair([selected, tile.id]);
      setResults((prev) => [...prev, {
        word: first.type === "word" ? first.text : tile.text,
        meaning: first.type === "meaning" ? first.text : tile.text,
        correct: false,
        exerciseType: "match",
      }]);
      setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 600);
    }
  }

  // Auto-advance when all matched
  useEffect(() => {
    if (!allMatched) return;
    const timer = setTimeout(() => onComplete(results), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMatched]);

  return (
    <div className="flex flex-col items-center gap-5">
      <ExerciseHeader
        label="Match"
        labelColor="#A064FF"
        current={matched.size / 2}
        total={matchItems.length}
        progress={progress}
      />

      <p className="text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
        Tap a word, then tap its meaning
      </p>

      <div className="w-full max-w-[360px] grid grid-cols-2 gap-2.5">
        {tiles.map((tile) => {
          const isSelected = selected === tile.id;
          const isMatched = matched.has(tile.id);
          const isWrong = wrongPair?.includes(tile.id);

          return (
            <button
              key={tile.id}
              onClick={() => handleTileClick(tile)}
              disabled={isMatched}
              className={cn(
                "px-3 py-3.5 rounded-xl border text-sm font-medium transition duration-normal text-center min-h-[52px]",
                isMatched && "opacity-40 scale-95",
              )}
              style={{
                borderColor: isWrong
                  ? "rgba(239,68,68,0.5)"
                  : isSelected
                  ? "rgba(46,211,198,0.5)"
                  : isMatched
                  ? "rgba(46,211,198,0.2)"
                  : "var(--color-border)",
                background: isWrong
                  ? "rgba(239,68,68,0.08)"
                  : isSelected
                  ? "rgba(46,211,198,0.1)"
                  : isMatched
                  ? "rgba(46,211,198,0.05)"
                  : "var(--color-bg-card)",
                color: isMatched
                  ? "var(--color-success)"
                  : tile.type === "word"
                  ? "var(--color-text)"
                  : "var(--color-text-secondary)",
                fontWeight: tile.type === "word" ? 600 : 400,
                fontStyle: tile.type === "meaning" ? "italic" : "normal",
              }}
            >
              {tile.text}
            </button>
          );
        })}
      </div>

      {allMatched && (
        <p className="text-sm font-semibold animate-fadeSlideUp" style={{ color: "var(--color-success)" }}>
          All matched! ✓
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 3: CONTEXT — Fill word in a sentence
// ═══════════════════════════════════════════════════════════════════════════

function ContextPhase({
  items,
  allItems,
  onComplete,
}: {
  items: ApiVocabItem[]; // only items with example_sentence
  allItems: ApiVocabItem[]; // all items for distractor generation
  onComplete: (results: ExerciseResult[]) => void;
}) {
  const { play } = useSound();
  const shuffled = useMemo(() => shuffle(items), [items]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [results, setResults] = useState<ExerciseResult[]>([]);

  const current = shuffled[index];
  const isLast = index === shuffled.length - 1;

  // Build 4 options: correct word + 3 distractors
  const options = useMemo(() => {
    const distractors = allItems
      .filter((i) => i.id !== current.id)
      .map((i) => i.word);
    const picked = shuffle(distractors).slice(0, 3);
    // Ensure exactly 4 options (pad with fallback if not enough distractors)
    while (picked.length < 3) picked.push("—");
    return shuffle([current.word, ...picked]);
  }, [current, allItems]);

  // Build sentence with blank
  const sentenceWithBlank = current.example_sentence
    ? current.example_sentence.replace(
        new RegExp(current.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        "______"
      )
    : `______ means "${current.meaning}"`;

  const isCorrect = selected === current.word;

  // Auto-advance after selection
  useEffect(() => {
    if (selected === null) return;
    const timer = setTimeout(() => {
      if (isLast) {
        onComplete(results);
      } else {
        setSelected(null);
        setIndex((i) => i + 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function handleSelect(word: string) {
    if (selected !== null) return;
    setSelected(word);
    if (word === current.word) play("correct"); else play("wrong");
    setResults((prev) => [...prev, {
      word: current.word,
      meaning: current.meaning,
      correct: word === current.word,
      exerciseType: "context",
    }]);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <ExerciseHeader
        label="Context"
        labelColor="#FFA726"
        current={index + 1}
        total={shuffled.length}
        progress={((index + 1) / shuffled.length) * 100}
      />

      {/* Sentence with blank */}
      <div
        className="w-full max-w-[360px] rounded-lg p-5"
        style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.5px] mb-2" style={{ color: "var(--color-text-secondary)" }}>
          Complete the sentence
        </p>
        <p className="text-base font-medium leading-relaxed" style={{ color: "var(--color-text)" }}>
          &ldquo;{sentenceWithBlank}&rdquo;
        </p>
      </div>

      {/* Options */}
      <div className="w-full max-w-[360px] grid grid-cols-2 gap-2.5">
        {options.map((word, i) => {
          const isThisSelected = selected === word;
          const isThisCorrect = word === current.word;
          const showResult = selected !== null;

          return (
            <button
              key={`${word}-${i}`}
              onClick={() => handleSelect(word)}
              disabled={selected !== null}
              className={cn(
                "px-4 py-3 rounded-xl border text-sm font-semibold transition duration-normal",
              )}
              style={{
                borderColor: showResult
                  ? isThisCorrect
                    ? "rgba(16,185,129,0.5)"
                    : isThisSelected
                    ? "rgba(239,68,68,0.5)"
                    : "var(--color-border)"
                  : "var(--color-border)",
                background: showResult
                  ? isThisCorrect
                    ? "rgba(16,185,129,0.1)"
                    : isThisSelected
                    ? "rgba(239,68,68,0.08)"
                    : "var(--color-bg-card)"
                  : "var(--color-bg-card)",
                color: showResult
                  ? isThisCorrect
                    ? "#10B981"
                    : isThisSelected
                    ? "#EF4444"
                    : "var(--color-text-secondary)"
                  : "var(--color-text)",
                opacity: showResult && !isThisCorrect && !isThisSelected ? 0.5 : 1,
              }}
            >
              {word}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {selected !== null && (
        <div
          className={cn(
            "text-sm font-medium text-center animate-fadeSlideUp",
            isCorrect ? "text-emerald-400" : "text-red-400"
          )}
        >
          {isCorrect ? "Correct! ✓" : `The answer is: ${current.word}`}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 4: RECALL — Type the word from its meaning
// ═══════════════════════════════════════════════════════════════════════════

function RecallPhase({
  items,
  onComplete,
}: {
  items: ApiVocabItem[];
  onComplete: (results: ExerciseResult[]) => void;
}) {
  const { play } = useSound();
  const shuffled = useMemo(() => shuffle(items), [items]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = shuffled[index];
  const isLast = index === shuffled.length - 1;

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [index]);

  function handleSubmit() {
    if (answered || !input.trim()) return;
    const isCorrect = normalize(input) === normalize(current.word);
    setCorrect(isCorrect);
    setAnswered(true);
    if (isCorrect) play("correct"); else play("wrong");
    setResults((prev) => [...prev, {
      word: current.word,
      meaning: current.meaning,
      correct: isCorrect,
      exerciseType: "recall",
    }]);
  }

  useEffect(() => {
    if (!answered) return;
    const timer = setTimeout(() => {
      if (isLast) {
        onComplete(results);
      } else {
        setInput("");
        setAnswered(false);
        setCorrect(false);
        setIndex((i) => i + 1);
      }
    }, 1400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered]);

  return (
    <div className="flex flex-col items-center gap-5">
      <ExerciseHeader
        label="Recall"
        labelColor="#2ED3C6"
        current={index + 1}
        total={shuffled.length}
        progress={((index + 1) / shuffled.length) * 100}
      />

      <div
        className="w-full max-w-[360px] rounded-lg p-6 flex flex-col items-center gap-4"
        style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-card)", minHeight: 140 }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.5px]" style={{ color: "var(--color-text-secondary)" }}>
          Type the word
        </p>
        <p className="text-lg font-semibold text-center" style={{ color: "var(--color-accent)" }}>
          {current.meaning}
        </p>
      </div>

      <div className="w-full max-w-[360px]">
        <div
          className={cn(
            "rounded-xl border transition duration-normal",
            answered
              ? correct ? "border-emerald-500/50 bg-emerald-500/[0.06]" : "border-red-500/50 bg-red-500/[0.06]"
              : ""
          )}
          style={!answered ? { borderColor: "var(--color-border)", background: "var(--color-primary-soft)" } : {}}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            disabled={answered}
            placeholder="Type the English word…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full bg-transparent px-4 py-3.5 text-sm outline-none rounded-xl text-center font-semibold"
            style={{ color: "var(--color-text)" }}
          />
        </div>

        {answered && (
          <div
            className={cn(
              "mt-3 rounded-xl px-4 py-2.5 text-sm font-medium text-center animate-fadeSlideUp",
              correct ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                      : "bg-red-500/10 border border-red-500/30 text-red-300"
            )}
          >
            {correct ? "Correct! ✓" : <>Correct answer: <span className="font-bold">{current.word}</span></>}
          </div>
        )}

        {!answered && (
          <Button
            variant="success"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            disabled={!input.trim()}
            className="mt-3"
            style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))" }}
          >
            Check
          </Button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5: RESULTS
// ═══════════════════════════════════════════════════════════════════════════

function ResultsPhase({
  results,
  onContinue,
}: {
  results: ExerciseResult[];
  onContinue: () => void;
}) {
  const correctCount = results.filter((r) => r.correct).length;
  const totalCount = results.length;
  const pct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const [animPct, setAnimPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimPct(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  // Group by exercise type for display
  const exerciseTypes = Array.from(new Set(results.map((r) => r.exerciseType)));

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Score circle */}
      <div className="relative w-[120px] h-[120px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" style={{ stroke: "var(--color-border)" }} />
          <circle
            cx="60" cy="60" r="52" fill="none" strokeWidth="8" strokeLinecap="round"
            style={{
              stroke: pct >= 80 ? "var(--color-success)" : pct >= 50 ? "var(--color-accent)" : "#f87171",
              strokeDasharray: `${2 * Math.PI * 52}`,
              strokeDashoffset: `${2 * Math.PI * 52 * (1 - animPct / 100)}`,
              transition: "stroke-dashoffset 1s ease-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-sora font-bold" style={{ color: "var(--color-text)" }}>{pct}%</span>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>accuracy</span>
        </div>
      </div>

      <p className="text-base font-semibold text-center" style={{ color: "var(--color-text)" }}>
        {pct === 100 ? "Perfect! You nailed it."
          : pct >= 70 ? "Great job! Keep it up."
          : pct >= 40 ? "Good effort. Review the words you missed."
          : "Keep practicing — you'll get there!"}
      </p>

      {/* Exercise breakdown */}
      <div className="w-full max-w-[360px] flex items-center gap-2 justify-center">
        {exerciseTypes.map((type) => {
          const typeResults = results.filter((r) => r.exerciseType === type);
          const typeCorrect = typeResults.filter((r) => r.correct).length;
          return (
            <div
              key={type}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: "var(--color-primary-soft)", border: "1px solid var(--color-border)" }}
            >
              <span className="font-semibold capitalize" style={{ color: "var(--color-text)" }}>{type}</span>
              <span style={{ color: "var(--color-text-secondary)" }}>{typeCorrect}/{typeResults.length}</span>
            </div>
          );
        })}
      </div>

      {/* Word results */}
      <div className="w-full max-w-[360px] flex flex-col gap-2">
        {/* Deduplicate by word — show best result per word */}
        {Array.from(new Map(results.map((r) => [r.word, r] as [string, ExerciseResult])).values()).map((r, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm",
              r.correct ? "border-emerald-500/20 bg-emerald-500/[0.05]" : "border-red-500/20 bg-red-500/[0.05]"
            )}
          >
            <span className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs",
              r.correct ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}>
              {r.correct ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold" style={{ color: "var(--color-text)" }}>{r.word}</span>
              <span className="mx-1.5" style={{ color: "var(--color-text-secondary)" }}>—</span>
              <span style={{ color: "var(--color-text-secondary)" }}>{r.meaning}</span>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="success"
        size="lg"
        fullWidth
        className="max-w-[360px]"
        onClick={onContinue}
        style={{ background: "linear-gradient(to right, var(--color-success), var(--color-accent))" }}
      >
        Continue &rarr;
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — Orchestrates the phase sequence
// ═══════════════════════════════════════════════════════════════════════════

export default function VocabSection({ items, onContinue }: VocabSectionProps) {
  const phases = useMemo(() => buildPhaseSequence(items), [items]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [allResults, setAllResults] = useState<ExerciseResult[]>([]);

  const currentPhase = phases[phaseIndex];

  // Guard: if no items, skip straight to continue
  useEffect(() => {
    if (items.length === 0) onContinue();
  }, [items, onContinue]);

  if (items.length === 0) return null;

  const advancePhase = (results?: ExerciseResult[]) => {
    if (results) setAllResults((prev) => [...prev, ...results]);
    setPhaseIndex((i) => i + 1);
  };

  // Items with example_sentence for context phase
  const contextItems = items.filter((i) => i.example_sentence);

  // Overall phase progress indicator
  const phaseProgress = ((phaseIndex + 1) / phases.length) * 100;

  return (
    <div>
      {/* Overall lesson progress — shows which exercise phase we're in */}
      {currentPhase !== "results" && (
        <div className="flex items-center gap-1 mb-4">
          {phases.filter((p) => p !== "results").map((p, i) => (
            <div
              key={p}
              className="flex-1 h-1 rounded-full transition duration-normal"
              style={{
                background:
                  phases.indexOf(p) < phaseIndex
                    ? "var(--color-success)"
                    : phases.indexOf(p) === phaseIndex
                    ? "linear-gradient(to right, var(--color-success), var(--color-accent))"
                    : "var(--color-border)",
              }}
            />
          ))}
        </div>
      )}

      {currentPhase === "learn" && (
        <LearnPhase items={items} onComplete={() => advancePhase()} />
      )}
      {currentPhase === "match" && (
        <MatchPhase items={items} onComplete={(r) => advancePhase(r)} />
      )}
      {currentPhase === "context" && (
        <ContextPhase
          items={contextItems}
          allItems={items}
          onComplete={(r) => advancePhase(r)}
        />
      )}
      {currentPhase === "recall" && (
        <RecallPhase items={items} onComplete={(r) => advancePhase(r)} />
      )}
      {currentPhase === "results" && (
        <ResultsPhase results={allResults} onContinue={onContinue} />
      )}
    </div>
  );
}
