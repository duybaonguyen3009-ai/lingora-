"use client";

/**
 * useTodayFocus
 *
 * Fetches 0–2 personalised focus recommendations from the coach API.
 * Data is cached for the duration of the page session — no aggressive
 * re-fetching, since recommendations only change after new practice activity.
 *
 * Returns an empty array while loading or on error so the homepage card
 * degrades gracefully (shows positive empty state). Errors are logged
 * to the console for visibility.
 */

import { useState, useEffect } from "react";
import { getTodayFocus }       from "@/lib/api";
import type { FocusRecommendation } from "@/lib/types";

export function useTodayFocus(userId: string | null) {
  const [recommendations, setRecommendations] = useState<FocusRecommendation[]>([]);
  const [loading, setLoading]                 = useState(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setLoading(true);

    getTodayFocus(userId)
      .then((data) => {
        if (!cancelled) setRecommendations(data.recommendations);
      })
      .catch((err) => {
        console.warn("[useTodayFocus] Fetch failed:", err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  return { recommendations, loading };
}
