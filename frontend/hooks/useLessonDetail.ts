"use client";

import { useState, useEffect } from "react";
import { getLessonDetail, type ApiLessonDetail } from "@/lib/api";

export interface UseLessonDetailResult {
  detail: ApiLessonDetail | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches full lesson detail (vocab, quiz, speaking) for the given lesson ID.
 * Pass null to skip fetching (modal closed state).
 */
export function useLessonDetail(lessonId: string | null): UseLessonDetailResult {
  const [detail, setDetail] = useState<ApiLessonDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getLessonDetail(lessonId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
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
  }, [lessonId]);

  return { detail, loading, error };
}
