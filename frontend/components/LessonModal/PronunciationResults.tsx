"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import type { PronunciationResult, WordDetail } from "@/lib/types";

interface PronunciationResultsProps {
  result: PronunciationResult;
  onTryAgain: () => void;
  onNext: () => void;
  isLast: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "var(--color-success)";
  if (score >= 60) return "var(--color-primary)";
  if (score >= 40) return "var(--color-warning)";
  return "#EF4444";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent!";
  if (score >= 80) return "Great!";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs work";
}

function ScoreCircle({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 800;

    function animate(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const color = scoreColor(score);
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div ref={ref} className="relative flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle
          cx="64" cy="64" r="54"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="8"
        />
        <circle
          cx="64" cy="64" r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold tabular-nums" style={{ color: "var(--color-text)" }}>
          {animatedScore}
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>/ 100</span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-[100px] text-right" style={{ color: "var(--color-text-secondary)" }}>{label}</span>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8" style={{ color }}>
        {Math.round(score)}
      </span>
    </div>
  );
}

function WordPill({ word, isExpanded, onClick }: { word: WordDetail; isExpanded: boolean; onClick: () => void }) {
  const color = scoreColor(word.score);
  return (
    <div className="flex flex-col">
      <button
        onClick={onClick}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-normal border"
        )}
        style={{
          color,
          borderColor: isExpanded ? "var(--color-border)" : "transparent",
          backgroundColor: isExpanded ? "var(--color-bg-card-hover)" : "var(--color-primary-soft)",
        }}
      >
        {word.word}
        <span className="ml-1.5 text-xs opacity-60">{Math.round(word.score)}</span>
      </button>

      {isExpanded && word.phonemes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 px-1">
          {word.phonemes.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center px-1.5 py-1 rounded text-xs"
              style={{ backgroundColor: `${scoreColor(p.score)}15` }}
            >
              <span className="font-mono font-semibold" style={{ color: scoreColor(p.score) }}>
                {p.phoneme}
              </span>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{Math.round(p.score)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PronunciationResults({
  result,
  onTryAgain,
  onNext,
  isLast,
}: PronunciationResultsProps) {
  const [expandedWord, setExpandedWord] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Overall score */}
      <div className="flex flex-col items-center gap-2">
        <ScoreCircle score={result.overallScore} />
        <p
          className="text-base font-semibold"
          style={{ color: scoreColor(result.overallScore) }}
        >
          {scoreLabel(result.overallScore)}
        </p>
      </div>

      {/* Subscores */}
      <div className="flex flex-col gap-2 px-1">
        <SubScoreBar label="Accuracy" score={result.accuracyScore} />
        <SubScoreBar label="Fluency" score={result.fluencyScore} />
        <SubScoreBar label="Completeness" score={result.completenessScore} />
        <SubScoreBar label="Pronunciation" score={result.pronunciationScore} />
      </div>

      {/* Word breakdown */}
      {result.words.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.8px] mb-2" style={{ color: "var(--color-text-secondary)", opacity: 0.6 }}>
            Word Breakdown
          </p>
          <div className="flex flex-wrap gap-2">
            {result.words.map((w, i) => (
              <WordPill
                key={i}
                word={w}
                isExpanded={expandedWord === i}
                onClick={() => setExpandedWord(expandedWord === i ? null : i)}
              />
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)", opacity: 0.4 }}>
            Tap a word to see phoneme details
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="soft"
          size="lg"
          className="flex-1"
          onClick={onTryAgain}
        >
          Try Again
        </Button>
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onNext}
          style={!isLast ? { background: "var(--color-primary)" } : undefined}
        >
          {isLast ? "Finish Lesson" : "Next \u2192"}
        </Button>
      </div>
    </div>
  );
}
