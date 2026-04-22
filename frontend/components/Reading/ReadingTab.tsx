"use client";

/**
 * ReadingTab.tsx — Entry point for IELTS Reading in the Exam tab.
 *
 * Phase: home → select → reading → result
 * Modes: Practice (single passage) + Full Test (3 passages, 60 min)
 */

import { useState, useEffect, useCallback } from "react";
import { getReadingPassages } from "@/lib/api";
import type { ReadingPassageSummary, ReadingPracticeResult, ReadingFullTestResult } from "@/lib/types";
import ReadingScreen from "./ReadingScreen";
import ReadingResult from "./ReadingResult";
import FullTestLauncher from "./FullTestLauncher";
import FullTestRunner from "./FullTestRunner";

type Phase =
  | "home"
  | "select"
  | "reading"
  | "result"
  | "full_test_select"
  | "full_test_run"
  | "full_test_result";

// Adapter: collapse a Full Test result into the single-passage shape that
// ReadingResult currently expects. Per-passage breakdowns are flattened into
// one per_question_results array — Commit 7 will extend ReadingResult to
// render the per-section breakdown natively.
function fullTestResultToPracticeShape(r: ReadingFullTestResult): ReadingPracticeResult {
  return {
    score: r.total_score,
    total: r.total_questions,
    band_estimate: r.band_estimate,
    time_seconds: r.time_seconds,
    per_question_results: r.passage_breakdowns.flatMap((b) => b.per_question_results),
  };
}

const DIFFICULTY_TABS = [
  { id: "band_50_55", label: "5.0–5.5" },
  { id: "band_60_65", label: "6.0–6.5" },
  { id: "band_70_80", label: "7.0–8.0" },
  { id: "band_80_plus", label: "8.0+" },
];

const TOPICS = ["all", "environment", "society", "technology", "history", "science", "business", "health", "psychology", "philosophy", "economics", "neuroscience", "critical_theory"];

// ---------------------------------------------------------------------------
// Passage select screen
// ---------------------------------------------------------------------------

function PassageSelect({ onSelect, onBack }: { onSelect: (id: string) => void; onBack: () => void }) {
  const [difficulty, setDifficulty] = useState("band_50_55");
  const [topic, setTopic] = useState("all");
  const [passages, setPassages] = useState<ReadingPassageSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReadingPassages({
        difficulty,
        topic: topic === "all" ? undefined : topic,
        limit: 20,
      });
      setPassages(data.passages);
    } catch { /* silent */ }
    setLoading(false);
  }, [difficulty, topic]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium self-start" style={{ color: "var(--color-accent)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Back
      </button>

      <div>
        <h3 className="text-lg font-display font-bold" style={{ color: "var(--color-text)" }}>Choose a Passage</h3>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>Select your band level and topic</p>
      </div>

      {/* Band tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DIFFICULTY_TABS.map((d) => (
          <button key={d.id} onClick={() => setDifficulty(d.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all"
            style={{
              background: difficulty === d.id ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)",
              color: difficulty === d.id ? "#00A896" : "var(--color-text-secondary)",
              border: `1px solid ${difficulty === d.id ? "rgba(0,168,150,0.3)" : "var(--color-border)"}`,
            }}>
            Band {d.label}
          </button>
        ))}
      </div>

      {/* Topic filter */}
      <select value={topic} onChange={(e) => setTopic(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm"
        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
        {TOPICS.map((t) => (
          <option key={t} value={t}>{t === "all" ? "All Topics" : t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ")}</option>
        ))}
      </select>

      {/* Passages list */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg p-4 animate-pulse" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <div className="h-4 w-48 bg-white/5 rounded mb-2" /><div className="h-3 w-24 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : passages.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Không tìm thấy bài đọc nào cho bộ lọc này</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {passages.map((p) => (
            <button key={p.id} onClick={() => onSelect(p.id)}
              className="flex items-center gap-3 p-4 rounded-lg text-left transition-all active:scale-[0.98] hover:shadow-sm"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{p.passage_title}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ background: "rgba(0,168,150,0.08)", color: "#00A896" }}>{p.topic}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{p.estimated_minutes} min</span>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-tertiary)" }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ReadingTab
// ---------------------------------------------------------------------------

export default function ReadingTab({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>("home");
  const [activePassageId, setActivePassageId] = useState<string | null>(null);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [result, setResult] = useState<ReadingPracticeResult | null>(null);
  const [fullTestResult, setFullTestResult] = useState<ReadingFullTestResult | null>(null);

  const handleSelectPassage = (id: string) => {
    setActivePassageId(id);
    setPhase("reading");
  };

  const handleComplete = (r: ReadingPracticeResult) => {
    setResult(r);
    setPhase("result");
  };

  const handleFullTestComplete = (r: ReadingFullTestResult) => {
    setFullTestResult(r);
    setPhase("full_test_result");
  };

  const handlePracticeAgain = () => {
    setResult(null);
    setActivePassageId(null);
    setPhase("select");
  };

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------

  if (phase === "reading" && activePassageId) {
    return (
      <ReadingScreen
        passageId={activePassageId}
        onComplete={handleComplete}
        onClose={() => setPhase("select")}
      />
    );
  }

  if (phase === "full_test_run" && activeTestId) {
    return (
      <FullTestRunner
        testId={activeTestId}
        onComplete={handleFullTestComplete}
        onClose={() => { setActiveTestId(null); setPhase("full_test_select"); }}
      />
    );
  }

  if (phase === "result" && result) {
    return (
      <ReadingResult
        result={result}
        onPracticeAgain={handlePracticeAgain}
        onClose={() => { setPhase("home"); setResult(null); }}
      />
    );
  }

  if (phase === "full_test_result" && fullTestResult) {
    const sections = fullTestResult.passage_breakdowns.map((b, i) => ({
      label: `Passage ${i + 1}`,
      score: b.score,
      total: b.total,
      band: b.band,
    }));
    return (
      <ReadingResult
        result={fullTestResultToPracticeShape(fullTestResult)}
        sections={sections}
        late={fullTestResult.late}
        onPracticeAgain={() => { setFullTestResult(null); setActiveTestId(null); setPhase("full_test_select"); }}
        onClose={() => { setPhase("home"); setFullTestResult(null); setActiveTestId(null); }}
      />
    );
  }

  // Wrap in full-screen overlay
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }}>
          <span style={{ color: "var(--color-text)" }}>←</span>
        </button>
        <div className="font-semibold text-base" style={{ color: "var(--color-text)" }}>IELTS Reading</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto">
          {phase === "home" && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl font-display font-bold" style={{ color: "var(--color-text)" }}>Reading Practice</h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>Improve your reading comprehension skills</p>
              </div>

              {/* Practice Mode card */}
              <button onClick={() => setPhase("select")}
                className="w-full text-left rounded-xl p-5 transition-all active:scale-[0.98]"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderLeft: "4px solid #00A896" }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(0,168,150,0.10)" }}>
                    📖
                  </div>
                  <div>
                    <div className="font-semibold text-base mb-0.5" style={{ color: "var(--color-text)" }}>Practice Mode</div>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Choose your topic and band level. Practice at your own pace.</p>
                  </div>
                </div>
              </button>

              {/* Full Test card */}
              <button
                onClick={() => setPhase("full_test_select")}
                className="w-full text-left rounded-xl p-5 transition-all active:scale-[0.98]"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderLeft: "4px solid #F59E0B" }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-xl shrink-0" style={{ background: "rgba(245,158,11,0.10)" }}>
                    📝
                  </div>
                  <div>
                    <div className="font-semibold text-base mb-0.5" style={{ color: "var(--color-text)" }}>Full Test Mode</div>
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>3 passages, 60 minutes. Simulates real exam conditions.</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {phase === "select" && (
            <PassageSelect onSelect={handleSelectPassage} onBack={() => setPhase("home")} />
          )}

          {phase === "full_test_select" && (
            <FullTestLauncher
              onSelect={(id) => { setActiveTestId(id); setPhase("full_test_run"); }}
              onBack={() => setPhase("home")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
