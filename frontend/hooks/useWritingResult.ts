"use client";

/**
 * useWritingResult — polls a writing submission until completed or failed.
 *
 * Polling: fetches every POLL_INTERVAL_MS (3s) up to MAX_POLL_ATTEMPTS
 * (40 attempts = 120s wall-clock). 40 covers two worst-case 60s scoring
 * pipelines back-to-back, so cache misses that spike latency still
 * surface a result instead of hanging the UI forever.
 *
 * After the cap, `status` flips to 'timeout'. The consumer can show an
 * error card + retry button; calling refetch() resets the attempt
 * counter and starts a fresh poll cycle.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { getWritingResult } from "@/lib/api";
import { useSocket } from "@/contexts/SocketContext";
import type { WritingSubmission } from "@/lib/types";

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 40;

export type WritingResultStatus = "idle" | "loading" | "polling" | "completed" | "failed" | "timeout" | "error";

interface UseWritingResultReturn {
  submission: WritingSubmission | null;
  loading: boolean;
  error: string | null;
  polling: boolean;
  status: WritingResultStatus;
  timedOut: boolean;
  refetch: () => void;
}

export function useWritingResult(submissionId: string | null): UseWritingResultReturn {
  const { socket } = useSocket();
  const [submission, setSubmission] = useState<WritingSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResult = useCallback(async () => {
    if (!submissionId) return;

    try {
      const result = await getWritingResult(submissionId);
      setSubmission(result);

      if (result.status === "pending") {
        if (pollCount.current < MAX_POLL_ATTEMPTS) {
          setPolling(true);
          pollCount.current += 1;
          timerRef.current = setTimeout(fetchResult, POLL_INTERVAL_MS);
        } else {
          // Exhausted the budget — surface timeout state for the retry UX.
          setPolling(false);
          setLoading(false);
          setTimedOut(true);
          console.warn(`[useWritingResult] timeout after ${MAX_POLL_ATTEMPTS} attempts for submission ${submissionId}`);
        }
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
    setTimedOut(false);

    fetchResult();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [submissionId, fetchResult]);

  // Realtime: server emits writing:result_ready when scoring finishes.
  // Cancel the pending poll, refetch immediately. Polling stays as the
  // fallback path (registry not booted, socket disconnected, replay).
  useEffect(() => {
    if (!socket || !submissionId) return;
    const onReady = (payload: { submissionId: string; status: string }) => {
      if (payload?.submissionId !== submissionId) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      fetchResult();
    };
    socket.on("writing:result_ready", onReady);
    return () => { socket.off("writing:result_ready", onReady); };
  }, [socket, submissionId, fetchResult]);

  const refetch = useCallback(() => {
    pollCount.current = 0;
    setLoading(true);
    setError(null);
    setTimedOut(false);
    fetchResult();
  }, [fetchResult]);

  const status: WritingResultStatus = (() => {
    if (error) return "error";
    if (timedOut) return "timeout";
    if (submission?.status === "completed") return "completed";
    if (submission?.status === "failed") return "failed";
    if (polling) return "polling";
    if (loading) return "loading";
    return "idle";
  })();

  return { submission, loading, error, polling, status, timedOut, refetch };
}
