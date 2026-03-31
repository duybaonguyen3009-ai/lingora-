"use client";

/**
 * IeltsTimer.tsx
 *
 * Countdown timer for IELTS Speaking test phases.
 * Safety guarantees:
 *  - setInterval always cleared on unmount (no memory leaks)
 *  - Multiple renders never start multiple intervals (ref guard)
 *  - onExpire called exactly once (hasExpired ref guard)
 *  - Timer never goes below 0
 */

import { useEffect, useRef, useState } from "react";

interface IeltsTimerProps {
  /** Total seconds to count down from */
  seconds: number;
  /** Called once when the timer reaches 0 */
  onExpire: () => void;
  /** Label shown above the timer, e.g. "Preparation time" */
  label: string;
}

export default function IeltsTimer({ seconds, onExpire, label }: IeltsTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasExpiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  // Keep onExpire ref fresh without restarting the effect
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    // Reset on seconds change (e.g. switching from prep to speaking)
    setRemaining(seconds);
    hasExpiredRef.current = false;

    // Clear any existing interval before starting a new one
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;

        if (next <= 0) {
          // Stop interval and fire onExpire exactly once
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (!hasExpiredRef.current) {
            hasExpiredRef.current = true;
            // Defer to avoid state update inside setState
            setTimeout(() => onExpireRef.current(), 0);
          }
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [seconds]); // re-init if total seconds changes

  // Format as MM:SS
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const isUrgent = remaining <= 10 && remaining > 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-bold font-mono tabular-nums transition-colors"
        style={{ color: isUrgent ? "#f87171" : "var(--color-text)" }}
      >
        {display}
      </span>
    </div>
  );
}
