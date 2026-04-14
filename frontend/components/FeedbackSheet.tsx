"use client";

/**
 * FeedbackSheet.tsx — Bottom sheet for post-activity feedback.
 *
 * Shows after speaking sessions, writing results, or lesson completions.
 * 3 emoji ratings → optional comment + tags → submit.
 * Non-blocking: user can skip, and submit failures are silent.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { submitFeedback } from "@/lib/api";
import type { FeedbackActivityType, FeedbackRating } from "@/lib/types";

interface FeedbackSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activityType: FeedbackActivityType;
  activityId?: string;
}

const RATING_OPTIONS: { value: FeedbackRating; emoji: string; label: string }[] = [
  { value: 3, emoji: "😍", label: "Great" },
  { value: 2, emoji: "😐", label: "Okay" },
  { value: 1, emoji: "😕", label: "Not great" },
];

const TAGS_BY_TYPE: Record<FeedbackActivityType, string[]> = {
  speaking: ["AI too slow", "Topic boring", "Scoring inaccurate"],
  writing: ["Feedback unclear", "Too strict", "Useful"],
  lesson: ["Too easy", "Too hard", "Bug found"],
};

export default function FeedbackSheet({ isOpen, onClose, activityType, activityId }: FeedbackSheetProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const interacted = useRef(false);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss after 3s if no interaction
  useEffect(() => {
    if (!isOpen) return;
    interacted.current = false;
    autoDismissTimer.current = setTimeout(() => {
      if (!interacted.current) onClose();
    }, 3000);
    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [isOpen, onClose]);

  const handleInteract = useCallback(() => {
    interacted.current = true;
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  }, []);

  const handleRating = useCallback((val: FeedbackRating) => {
    handleInteract();
    setRating(val);
  }, [handleInteract]);

  const toggleTag = useCallback((tag: string) => {
    handleInteract();
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, [handleInteract]);

  const handleSubmit = useCallback(async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await submitFeedback({
        activityType,
        activityId,
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setSubmitted(true);
      setTimeout(onClose, 800);
    } catch {
      // Silent fail — feedback is non-critical
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [rating, activityType, activityId, comment, selectedTags, onClose]);

  if (!isOpen) return null;

  const tags = TAGS_BY_TYPE[activityType] || [];

  return (
    <div
      className="fixed inset-0 z-sheet flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl px-5 py-5 animate-slideUp"
        style={{
          background: "var(--color-bg-card)",
          borderTop: "1px solid var(--color-border)",
        }}
        onClick={handleInteract}
      >
        {/* Submitted state */}
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              Thanks for your feedback!
            </p>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                How was this session?
              </h3>
              <button
                onClick={onClose}
                className="text-xs font-medium"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                Skip
              </button>
            </div>

            {/* Rating buttons */}
            <div className="flex justify-center gap-6 mb-4">
              {RATING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRating(opt.value)}
                  className="flex flex-col items-center gap-1 transition-all active:scale-95"
                  style={{ opacity: rating && rating !== opt.value ? 0.4 : 1 }}
                >
                  <span
                    className="text-4xl transition-transform"
                    style={{ transform: rating === opt.value ? "scale(1.2)" : "scale(1)" }}
                  >
                    {opt.emoji}
                  </span>
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Show comment + tags after rating selected */}
            {rating && (
              <div className="flex flex-col gap-3 animate-fadeIn">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: selectedTags.includes(tag)
                          ? "rgba(0,168,150,0.15)"
                          : "var(--color-bg-secondary)",
                        color: selectedTags.includes(tag)
                          ? "#00A896"
                          : "var(--color-text-secondary)",
                        border: selectedTags.includes(tag)
                          ? "1px solid rgba(0,168,150,0.3)"
                          : "1px solid var(--color-border)",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Comment */}
                <textarea
                  value={comment}
                  onChange={(e) => { handleInteract(); setComment(e.target.value); }}
                  placeholder="Tell us what happened... (optional)"
                  rows={2}
                  maxLength={500}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                  style={{ background: "#00A896", color: "#fff" }}
                >
                  {submitting ? "Đang gửi..." : "Gửi phản hồi"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 300ms ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 200ms ease-out;
        }
      `}</style>
    </div>
  );
}
