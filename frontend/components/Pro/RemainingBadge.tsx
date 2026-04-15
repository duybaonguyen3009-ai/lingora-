"use client";

/**
 * RemainingBadge — Shows "Còn N lượt [Speaking|Writing] hôm nay" for free users.
 *
 * Hides completely for Pro users and for guests (no data to show).
 * Follows Soul Audit voice: honest + direct + no manipulation.
 */

import type { LimitBucket } from "@/hooks/useDailyLimits";

interface RemainingBadgeProps {
  type: "speaking" | "writing";
  bucket: LimitBucket;
  /** Hide entirely when user is Pro / in free period / still loading. */
  hidden?: boolean;
}

export default function RemainingBadge({ type, bucket, hidden }: RemainingBadgeProps) {
  if (hidden) return null;
  if (bucket.remaining === null) return null; // unlimited — don't show
  if (!bucket.allowed) return null;            // limit hit — UpgradeTrigger takes over

  const label = type === "speaking" ? "Speaking" : "Writing";
  const n = bucket.remaining;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        background: "var(--color-accent-soft)",
        border: "1px solid rgba(0,168,150,0.18)",
        color: "var(--color-accent)",
      }}
    >
      <span aria-hidden>{type === "speaking" ? "🎤" : "✍️"}</span>
      <span>
        Còn <span className="font-semibold">{n}</span> lượt {label} hôm nay
      </span>
    </div>
  );
}
