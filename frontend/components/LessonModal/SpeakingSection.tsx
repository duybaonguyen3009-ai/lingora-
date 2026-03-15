"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { ApiSpeakingPrompt } from "@/lib/api";
import type { PronunciationResult } from "@/lib/types";
import {
  getAudioUploadUrl,
  uploadAudioBlob,
  assessPronunciation,
} from "@/lib/api";
import AudioRecorder from "./AudioRecorder";
import PronunciationResults from "./PronunciationResults";

type PromptState = "idle" | "recording" | "uploading" | "assessing" | "results" | "error";

interface SpeakingSectionProps {
  items: ApiSpeakingPrompt[];
  lessonId: string;
  userId: string;
  onContinue: (speakingScore: number) => void;
}

export default function SpeakingSection({
  items,
  lessonId,
  userId,
  onContinue,
}: SpeakingSectionProps) {
  const [index, setIndex] = useState(0);
  const [promptState, setPromptState] = useState<PromptState>("idle");
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Track best score per prompt index
  const [bestScores, setBestScores] = useState<Map<number, number>>(new Map());

  const current = items[index];
  const isLast = index === items.length - 1;

  // Reset per-prompt state when moving to a new prompt
  useEffect(() => {
    setPromptState("idle");
    setRevealed(false);
    setResult(null);
    setErrorMsg(null);
  }, [index]);

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      setPromptState("uploading");
      setErrorMsg(null);

      try {
        // 1. Get pre-signed upload URL
        const { uploadUrl, storageKey } = await getAudioUploadUrl(
          current.id,
          blob.type || "audio/webm"
        );

        // 2. Upload audio directly to storage
        await uploadAudioBlob(uploadUrl, blob);

        // 3. Assess pronunciation
        setPromptState("assessing");
        const assessResult = await assessPronunciation(
          lessonId,
          current.id,
          storageKey
        );

        setResult(assessResult);

        // Track best score
        setBestScores((prev) => {
          const next = new Map(prev);
          const existing = next.get(index) ?? 0;
          next.set(index, Math.max(existing, assessResult.overallScore));
          return next;
        });

        setPromptState("results");
      } catch (err) {
        setPromptState("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      }
    },
    [current.id, lessonId, index]
  );

  function handleTryAgain() {
    setPromptState("idle");
    setResult(null);
    setErrorMsg(null);
  }

  function handleNext() {
    if (isLast) {
      // Compute average of best scores across all prompts
      const scores = Array.from(bestScores.values());
      const avg =
        scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : 0;
      onContinue(avg);
    } else {
      setIndex((i) => i + 1);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index
                ? "w-6 bg-[#A064FF]"
                : i < index
                ? "w-2.5 bg-[#A064FF]/40"
                : "w-2.5 bg-white/[0.1]"
            )}
          />
        ))}
      </div>

      {/* Prompt card — always visible */}
      <div className="rounded-2xl border border-[#A064FF]/20 bg-[#A064FF]/[0.05] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#A064FF] mb-3">
          Speaking Prompt
        </p>
        <p className="text-[16px] font-semibold text-[#E6EDF3] leading-relaxed">
          {current.prompt_text}
        </p>
        {current.hint && (
          <p className="text-[12px] text-[#A6B3C2]/60 mt-3 italic">
            💡 {current.hint}
          </p>
        )}
      </div>

      {/* Sample answer toggle — hidden when showing results */}
      {current.sample_answer && promptState !== "results" && (
        <div>
          <button
            onClick={() => setRevealed((v) => !v)}
            className={cn(
              "text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200",
              revealed
                ? "bg-[#A064FF]/15 border-[#A064FF]/25 text-[#A064FF]"
                : "bg-white/[0.04] border-white/[0.08] text-[#A6B3C2] hover:border-[#A064FF]/25 hover:text-[#A064FF]"
            )}
          >
            {revealed ? "Hide Sample Answer" : "Reveal Sample Answer"}
          </button>
          {revealed && (
            <div className="mt-3 px-4 py-3 rounded-xl bg-[#0B2239] border border-[#A064FF]/15 text-[13px] text-[#A6B3C2] leading-relaxed">
              {current.sample_answer}
            </div>
          )}
        </div>
      )}

      {/* Audio recorder — visible in idle state */}
      {promptState === "idle" && (
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          disabled={false}
        />
      )}

      {/* Processing states */}
      {promptState === "uploading" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#A064FF]/30 border-t-[#A064FF] animate-spin" />
          <p className="text-[13px] text-[#A6B3C2]">Uploading audio…</p>
        </div>
      )}

      {promptState === "assessing" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#A064FF]/30 border-t-[#A064FF] animate-spin" />
          <p className="text-[13px] text-[#A6B3C2]">Analyzing pronunciation…</p>
        </div>
      )}

      {/* Error state */}
      {promptState === "error" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-[13px] text-red-400">{errorMsg}</p>
          <button
            onClick={handleTryAgain}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold bg-[#A064FF]/15 border border-[#A064FF]/20 text-[#A064FF] hover:bg-[#A064FF]/25 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {promptState === "results" && result && (
        <PronunciationResults
          result={result}
          onTryAgain={handleTryAgain}
          onNext={handleNext}
          isLast={isLast}
        />
      )}

      {/* Prompt counter */}
      <p className="text-[12px] text-[#A6B3C2]/50 text-center">
        {index + 1} / {items.length} prompts
        {bestScores.has(index) && (
          <span className="ml-2 text-[#A064FF]">
            Best: {Math.round(bestScores.get(index)!)}%
          </span>
        )}
      </p>
    </div>
  );
}
