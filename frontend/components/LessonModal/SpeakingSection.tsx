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
        const { uploadUrl, storageKey } = await getAudioUploadUrl(
          current.id,
          blob.type || "audio/webm"
        );
        await uploadAudioBlob(uploadUrl, blob);

        setPromptState("assessing");
        const assessResult = await assessPronunciation(
          lessonId,
          current.id,
          storageKey
        );

        setResult(assessResult);

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
              i === index ? "w-6" : "w-2.5"
            )}
            style={{
              backgroundColor:
                i === index
                  ? "var(--color-primary)"
                  : i < index
                  ? "var(--color-primary-glow)"
                  : "var(--color-border)",
            }}
          />
        ))}
      </div>

      {/* Conversation-thread prompt — chat bubble style */}
      <div className="flex gap-3 items-start">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
          style={{ backgroundColor: "var(--color-primary-soft)" }}
        >
          🎯
        </div>
        <div
          className="flex-1 rounded-2xl rounded-tl-md p-4"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.8px] mb-2"
            style={{ color: "var(--color-primary)" }}
          >
            Speaking Prompt
          </p>
          <p
            className="text-[15px] font-semibold leading-relaxed"
            style={{ color: "var(--color-text)" }}
          >
            {current.prompt_text}
          </p>
          {current.hint && (
            <p
              className="text-[12px] mt-2.5 italic"
              style={{ color: "var(--color-text-secondary)", opacity: 0.7 }}
            >
              💡 {current.hint}
            </p>
          )}
        </div>
      </div>

      {/* Sample answer toggle — hidden when showing results */}
      {current.sample_answer && promptState !== "results" && (
        <div className="pl-11">
          <button
            onClick={() => setRevealed((v) => !v)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200"
            style={{
              backgroundColor: revealed ? "var(--color-primary-soft)" : "transparent",
              borderColor: revealed ? "var(--color-primary-glow)" : "var(--color-border)",
              color: revealed ? "var(--color-primary)" : "var(--color-text-secondary)",
            }}
          >
            {revealed ? "Hide Sample Answer" : "Reveal Sample Answer"}
          </button>
          {revealed && (
            <div
              className="mt-2 px-4 py-3 rounded-xl text-[13px] leading-relaxed"
              style={{
                backgroundColor: "var(--color-bg-card-hover)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              {current.sample_answer}
            </div>
          )}
        </div>
      )}

      {/* Audio recorder — visible in idle state, fixed at bottom of conversation */}
      {promptState === "idle" && (
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          disabled={false}
        />
      )}

      {/* Processing states */}
      {(promptState === "uploading" || promptState === "assessing") && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-8 h-8 rounded-full border-2 animate-spin"
            style={{
              borderColor: "var(--color-primary-glow)",
              borderTopColor: "var(--color-primary)",
            }}
          />
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>
            {promptState === "uploading" ? "Uploading audio…" : "Analyzing pronunciation…"}
          </p>
        </div>
      )}

      {/* Error state */}
      {promptState === "error" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-[13px] text-red-400">{errorMsg}</p>
          <button
            onClick={handleTryAgain}
            className="px-5 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200"
            style={{
              backgroundColor: "var(--color-primary-soft)",
              border: "1px solid var(--color-primary-glow)",
              color: "var(--color-primary)",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results — scores only shown here after speaking */}
      {promptState === "results" && result && (
        <PronunciationResults
          result={result}
          onTryAgain={handleTryAgain}
          onNext={handleNext}
          isLast={isLast}
        />
      )}

      {/* Prompt counter */}
      <p className="text-[12px] text-center" style={{ color: "var(--color-text-secondary)", opacity: 0.5 }}>
        {index + 1} / {items.length} prompts
      </p>
    </div>
  );
}
