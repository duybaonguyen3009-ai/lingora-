"use client";

/**
 * Honest empty state for history pages (Wave 2.9).
 *
 * Soul §1: when the user has nothing to show, we tell them exactly
 * what to do — no zero-stat placeholders that mimic real progress.
 * Each domain page passes its own copy + CTA target.
 */

import { useRouter } from "next/navigation";
import Mascot from "@/components/ui/Mascot";

interface HistoryEmptyStateProps {
  message:  string;
  ctaLabel: string;
  ctaHref:  string;
}

export default function HistoryEmptyState({ message, ctaLabel, ctaHref }: HistoryEmptyStateProps) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center text-center py-10 gap-4">
      <Mascot size={96} mood="thinking" />
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
      <button
        onClick={() => router.push(ctaHref)}
        className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        style={{
          background: "linear-gradient(135deg, #00A896, #00C4B0)",
          color: "#fff",
          boxShadow: "0 4px 16px rgba(0,168,150,0.25)",
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
