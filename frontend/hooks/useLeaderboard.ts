/**
 * hooks/useLeaderboard.ts
 *
 * Fetches leaderboard data for the given scope.
 * Re-fetches when scope changes.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardData } from "@/lib/types";

interface UseLeaderboardResult {
  data:    LeaderboardData | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useLeaderboard(
  scope: "weekly" | "all-time" = "all-time",
): UseLeaderboardResult {
  const [data,    setData]    = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getLeaderboard(scope);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
