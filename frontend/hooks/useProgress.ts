"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserProgress, type ApiProgressItem } from "@/lib/api";

export interface UseProgressResult {
  progress: ApiProgressItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches all completed lessons for the given user ID.
 * Pass null to skip fetching (before guest UUID is hydrated).
 * Call refresh() after completing a lesson to re-fetch.
 */
export function useProgress(userId: string | null): UseProgressResult {
  const [progress, setProgress] = useState<ApiProgressItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getUserProgress(userId)
      .then((data) => {
        if (!cancelled) {
          setProgress(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError((err as Error).message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return { progress, loading, error, refresh };
}
