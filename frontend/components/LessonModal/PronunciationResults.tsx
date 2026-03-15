"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { PronunciationResult, WordDetail } from "@/lib/types";

interface PronunciationResultsProps {
  result: PronunciationResult;
  onTryAgain: () => void;
  onNext: () => void;
  isLast: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "#2ED3C6"; // teal/green
  if (score >= 60) return "#A064FF"; // purple
  if (score >= 40) return "#F5A524"; // amber
  return "#EF4444"; // red
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
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
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
        {/* Background circle */}
        <circle
          cx="64" cy="64" r="54"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {/* Score arc */}
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
        <span className="text-[28px] font-bold text-[#E6EDF3] tabular-nums">
          {animatedScore}
        </span>
        <span className="text-[11px] text-[#A6B3C2]">/ 100</span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[#A6B3C2] w-[100px] text-right">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[12px] font-semibold tabular-nums w-8" style={{ color }}>
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
          "px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 border",
          isExpanded
            ? "border-white/[0.15] bg-white/[0.08]"
            : "border-transparent bg-white/[0.04] hover:bg-white/[0.08]"
        )}
        style={{ color }}
      >
        {word.word}
        <span className="ml-1.5 text-[10px] opacity-60">{Math.round(word.score)}</span>
      </button>

      {/* Expanded phoneme detail */}
      {isExpanded && word.phonemes.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1 px-1">
          {word.phonemes.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center px-1.5 py-1 rounded text-[10px]"
              style={{ backgroundColor: `${scoreColor(p.score)}15` }}
            >
              <span className="font-mono font-semibold" style={{ color: scoreColor(p.score) }}>
                {p.phoneme}
              </span>
              <span className="text-[9px] text-[#A6B3C2]">{Math.round(p.score)}</span>
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
          className="text-[15px] font-semibold"
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
          <p className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#A6B3C2]/60 mb-2">
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
          <p className="text-[10px] text-[#A6B3C2]/40 mt-2">
            Tap a word to see phoneme details
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onTryAgain}
          className="flex-1 py-3 rounded-xl font-semibold text-[14px] bg-[#A064FF]/15 border border-[#A064FF]/20 text-[#A064FF] hover:bg-[#A064FF]/25 transition-all duration-200"
        >
          Try Again
        </button>
        <button
          onClick={onNext}
          className={cn(
            "flex-1 py-3 rounded-xl font-semibold text-[14px] transition-all duration-200",
            isLast
              ? "bg-gradient-to-r from-[#2ED3C6] to-[#2DA8FF] text-[#071A2F] hover:opacity-90"
              : "bg-[#A064FF]/20 border border-[#A064FF]/25 text-[#A064FF] hover:bg-[#A064FF]/30"
          )}
        >
          {isLast ? "Finish Lesson" : "Next →"}
        </button>
      </div>
    </div>
  );
}
