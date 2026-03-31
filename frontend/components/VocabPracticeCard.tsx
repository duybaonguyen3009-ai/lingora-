"use client";

/**
 * VocabPracticeCard.tsx
 *
 * Quick-access card for standalone vocabulary practice on the Practice tab.
 * Pulls vocab from all available lessons and launches a recall-only drill
 * (no quiz/speaking steps, no completion tracking — pure vocab training).
 *
 * Uses the same VocabSection component from LessonModal for consistency.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { getLessons, getLessonDetail, type ApiLesson, type ApiVocabItem } from "@/lib/api";
import VocabSection from "./LessonModal/VocabSection";

// ─── Constants ──────────────────────────────────────────────────────────────

/** Max words per quick practice session */
const QUICK_PRACTICE_SIZE = 10;

// ─── Helpers ────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function VocabPracticeCard() {
  const [mode, setMode] = useState<"card" | "loading" | "active" | "done">("card");
  const [vocabPool, setVocabPool] = useState<ApiVocabItem[]>([]);
  const [sessionItems, setSessionItems] = useState<ApiVocabItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load vocab pool once when user clicks "Start"
  const loadVocab = useCallback(async () => {
    setMode("loading");
    setError(null);

    try {
      const lessons = await getLessons();
      // Pick a subset of lessons to fetch details from (max 5 to avoid many requests)
      const lessonsToFetch = lessons.slice(0, 5);

      const details = await Promise.all(
        lessonsToFetch.map((l) => getLessonDetail(l.id).catch(() => null))
      );

      const allVocab: ApiVocabItem[] = [];
      for (const d of details) {
        if (d && d.vocab) {
          allVocab.push(...d.vocab);
        }
      }

      if (allVocab.length === 0) {
        setError("No vocabulary items available yet.");
        setMode("card");
        return;
      }

      setVocabPool(allVocab);

      // Pick random items for this session
      const selected = shuffle(allVocab).slice(0, QUICK_PRACTICE_SIZE);
      setSessionItems(selected);
      setMode("active");
    } catch (err) {
      setError("Could not load vocabulary. Try again.");
      setMode("card");
    }
  }, []);

  const handleComplete = useCallback(() => {
    setMode("done");
  }, []);

  const handleRestart = useCallback(() => {
    // Pick new random set from same pool
    const selected = shuffle(vocabPool).slice(0, QUICK_PRACTICE_SIZE);
    setSessionItems(selected);
    setMode("active");
  }, [vocabPool]);

  // ── Card mode (default view) ──
  if (mode === "card" || mode === "loading") {
    return (
      <div
        className="rounded-lg p-5 relative overflow-hidden"
        style={{
          border: "1px solid rgba(46,211,198,0.2)",
          background: "linear-gradient(135deg, rgba(46,211,198,0.06), rgba(45,168,255,0.04))",
        }}
      >
        {/* Glow */}
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-3xl" style={{ backgroundColor: "rgba(46,211,198,0.08)" }} />

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(46,211,198,0.15), rgba(45,168,255,0.15))",
              border: "1px solid rgba(46,211,198,0.2)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>
              Quick Vocab Practice
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              Test yourself on {QUICK_PRACTICE_SIZE} random words. Learn, then type from memory.
            </p>

            {error && (
              <p className="text-xs mt-2 text-red-400">{error}</p>
            )}

            <button
              onClick={loadVocab}
              disabled={mode === "loading"}
              className="mt-3 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-normal disabled:opacity-60"
              style={{
                background: "var(--color-success)",
                color: "var(--color-bg)",
              }}
            >
              {mode === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Loading…
                </span>
              ) : (
                "Start Practice"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Done mode ──
  if (mode === "done") {
    return (
      <div
        className="rounded-lg p-5 text-center"
        style={{
          border: "1px solid rgba(46,211,198,0.2)",
          background: "linear-gradient(135deg, rgba(46,211,198,0.06), rgba(45,168,255,0.04))",
        }}
      >
        <p className="text-base font-semibold mb-1" style={{ color: "var(--color-text)" }}>
          Session complete!
        </p>
        <p className="text-xs mb-4" style={{ color: "var(--color-text-secondary)" }}>
          Practice again with a new set of words?
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleRestart}
            className="px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--color-success)", color: "var(--color-bg)" }}
          >
            Practice Again
          </button>
          <button
            onClick={() => setMode("card")}
            className="px-5 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "var(--color-primary-soft)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── Active mode — full VocabSection ──
  return (
    <div
      className="rounded-lg p-5"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-bg-card)",
      }}
    >
      {/* Close button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setMode("card")}
          className="text-xs font-medium px-3 py-1 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Exit
        </button>
      </div>

      <VocabSection
        items={sessionItems}
        onContinue={handleComplete}
      />
    </div>
  );
}
