/**
 * hooks/useGamification.ts
 *
 * Fetches the authenticated user's gamification state (XP, streak, badges).
 * Returns null data while loading or when no userId is provided (guest).
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getUserGamification } from "@/lib/api";
import type { GamificationData } from "@/lib/types";

interface UseGamificationResult {
  data:    GamificationData | null;
  loading: boolean;
  error:   string | null;
  refetch: () => void;
}

export function useGamification(userId: string | null): UseGamificationResult {
  const [data,    setData]    = useState<GamificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getUserGamification(userId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load gamification data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
