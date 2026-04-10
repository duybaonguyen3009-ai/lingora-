"use client";

/**
 * useWritingResult — polls a writing submission until completed or failed.
 *
 * Usage:
 *   const { submission, loading, error, polling } = useWritingResult(submissionId);
 *
 * Polling: if status === 'pending', fetches every 3s up to 20 times (60s max).
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { getWritingResult } from "@/lib/api";
import type { WritingSubmission } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 20;

interface UseWritingResultReturn {
  submission: WritingSubmission | null;
  loading: boolean;
  error: string | null;
  polling: boolean;
  refetch: () => void;
}

export function useWritingResult(submissionId: string | null): UseWritingResultReturn {
  const [submission, setSubmission] = useState<WritingSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResult = useCallback(async () => {
    if (!submissionId) return;

    try {
      const result = await getWritingResult(submissionId);
      setSubmission(result);

      if (result.status === "pending" && pollCount.current < MAX_POLL_ATTEMPTS) {
        setPolling(true);
        pollCount.current += 1;
        timerRef.current = setTimeout(fetchResult, POLL_INTERVAL_MS);
      } else {
        setPolling(false);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load result");
      setPolling(false);
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    if (!submissionId) return;

    pollCount.current = 0;
    setLoading(true);
    setError(null);
    setPolling(false);
    setSubmission(null);

    fetchResult();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [submissionId, fetchResult]);

  const refetch = useCallback(() => {
    pollCount.current = 0;
    setLoading(true);
    setError(null);
    fetchResult();
  }, [fetchResult]);

  return { submission, loading, error, polling, refetch };
}
