"use client";

/**
 * useDailyLimits — Fetches the current user's Pro status + daily usage vs limits.
 *
 * Backing endpoint: GET /api/v1/users/daily-limits (see limitService.js)
 *
 * The server decides what counts as "unlimited" (pro / trial / free-period flag).
 * This hook is purely a data carrier — gating rules live in the backend.
 *
 * Returns:
 *   - `loading`     — true on initial fetch
 *   - `error`       — network/parse error message, null on success
 *   - `isPro`       — true if user is Pro (or server has free-period flag enabled)
 *   - `speaking`    — { used, limit, allowed, remaining }
 *   - `writing`     — { used, limit, allowed, remaining }
 *   - `refetch()`   — re-fetch after a successful session / submission
 */

import { useCallback, useEffect, useState } from "react";
import { getDailyLimits } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { DailyLimitsStatus } from "@/lib/types";

export interface LimitBucket {
  used: number;
  limit: number | null;
  allowed: boolean;
  /** `null` when unlimited (Pro / trial / free period). */
  remaining: number | null;
}

export interface UseDailyLimitsResult {
  loading: boolean;
  error: string | null;
  /** true when user is Pro, in trial, OR server is in open free-period. Hides counts. */
  isPro: boolean;
  /** true when gating is globally off — still hide counters. */
  freePeriod: boolean;
  speaking: LimitBucket;
  writing: LimitBucket;
  refetch: () => Promise<void>;
}

const EMPTY_BUCKET: LimitBucket = {
  used: 0,
  limit: null,
  allowed: true,
  remaining: null,
};

function bucketFromStatus(b: DailyLimitsStatus["speaking"]): LimitBucket {
  const remaining = b.limit === null ? null : Math.max(0, b.limit - b.used);
  return {
    used: b.used,
    limit: b.limit,
    allowed: b.allowed,
    remaining,
  };
}

export function useDailyLimits(): UseDailyLimitsResult {
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.isLoading);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DailyLimitsStatus | null>(null);

  const fetchLimits = useCallback(async () => {
    // No gating for guests — the endpoint requires auth. Return unlimited defaults.
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getDailyLimits();
      setData(result);
    } catch (err) {
      // Fail open: on error, hide the UI gating (don't block a paying user from a flaky call)
      console.warn("[useDailyLimits] failed to fetch:", err);
      setError(err instanceof Error ? err.message : "Failed to load limits");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    fetchLimits();
  }, [authLoading, fetchLimits]);

  // Derive buckets
  const isPro = data?.is_pro === true || data?.free_period === true;
  const freePeriod = data?.free_period === true;

  const speaking: LimitBucket = data
    ? bucketFromStatus(data.speaking)
    : EMPTY_BUCKET;
  const writing: LimitBucket = data
    ? bucketFromStatus(data.writing)
    : EMPTY_BUCKET;

  return {
    loading,
    error,
    isPro,
    freePeriod,
    speaking,
    writing,
    refetch: fetchLimits,
  };
}
