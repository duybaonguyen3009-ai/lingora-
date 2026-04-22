"use client";

/**
 * WritingTimerBar — fixed full-width bar at the top of the writing screen.
 * Shows HH:MM:SS countdown + progress bar that fills as time elapses.
 * Color transitions: green (0-70%) → yellow (70-90%) → red (>90%, pulsing).
 * Hidden when not in an active timed session.
 */

interface WritingTimerBarProps {
  timerSeconds: number | null;
  totalSeconds: number | null;
  /** Optional mode label rendered as a pill (e.g. "Full Test"). Hidden when omitted. */
  modeBadge?: string;
  /** When true, renders a Pause/Resume button wired to onPauseToggle. Practice mode only. */
  canPause?: boolean;
  paused?: boolean;
  onPauseToggle?: () => void;
}

function formatHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function WritingTimerBar({ timerSeconds, totalSeconds, modeBadge, canPause, paused, onPauseToggle }: WritingTimerBarProps) {
  if (timerSeconds === null || totalSeconds === null || totalSeconds <= 0) return null;

  const elapsedRatio = Math.min(Math.max((totalSeconds - timerSeconds) / totalSeconds, 0), 1);
  const remainingRatio = 1 - elapsedRatio;

  // Color bands based on elapsed time — paused state overrides with a muted grey.
  const isRed = !paused && elapsedRatio > 0.9;
  const isYellow = !paused && elapsedRatio > 0.7 && !isRed;

  const barColor = paused ? "var(--color-text-tertiary)" : isRed ? "#EF4444" : isYellow ? "#F59E0B" : "#16A34A";
  const textColor = paused ? "var(--color-text-tertiary)" : isRed ? "#EF4444" : isYellow ? "#F59E0B" : "var(--color-text)";

  return (
    <div
      className="shrink-0 w-full px-4 py-2.5"
      style={{
        background: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
      }}
      role="timer"
      aria-live="off"
    >
      <div className="flex items-center gap-3 max-w-[1400px] mx-auto">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: textColor }}
          className={isRed ? "animate-pulse" : ""}
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span
          className={`font-mono text-sm tabular-nums ${isRed ? "font-semibold animate-pulse" : "font-medium"}`}
          style={{ color: textColor, minWidth: "72px" }}
        >
          {formatHMS(Math.max(timerSeconds, 0))}
        </span>
        {modeBadge && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
            style={{
              background: "rgba(27,43,75,0.92)",
              color: "#fff",
              letterSpacing: "0.1em",
            }}
          >
            {modeBadge}
          </span>
        )}
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{ background: "var(--surface-skeleton)" }}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${isRed ? "animate-pulse" : ""}`}
            style={{
              width: `${remainingRatio * 100}%`,
              background: barColor,
            }}
          />
        </div>
        {canPause && onPauseToggle && (
          <button
            type="button"
            onClick={onPauseToggle}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 cursor-pointer"
            style={{
              background: paused ? "rgba(0,168,150,0.12)" : "var(--color-bg-secondary)",
              color: paused ? "#00A896" : "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
            aria-label={paused ? "Tiếp tục làm bài" : "Tạm dừng"}
          >
            {paused ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                <span>Tiếp tục</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                <span>Tạm dừng</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
