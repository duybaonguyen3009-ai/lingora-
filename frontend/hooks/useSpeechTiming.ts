"use client";

/**
 * useSpeechTiming
 *
 * Tracks real timing metadata from voice input sessions.
 * Records when recording starts/stops, calculates words per minute,
 * detects gaps between recording segments (pauses), and computes
 * a speaking ratio for Part 2 long turns.
 *
 * This provides REAL signals — not estimated or faked.
 * The data is passed to the backend for speech-aware scoring.
 */

import { useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpeechSegment {
  startTime: number;   // Date.now() when recording started
  endTime: number;     // Date.now() when final transcript received
  wordCount: number;   // words in this segment
  durationMs: number;  // endTime - startTime
}

export interface SpeechMetrics {
  totalDurationMs: number;
  wordsPerMinute: number;
  pauseCount: number;
  longestPauseMs: number;
  segmentCount: number;
  speakingRatio: number; // totalSpeakingMs / totalElapsedMs
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpeechTiming() {
  // Segments for the current turn
  const segmentsRef = useRef<SpeechSegment[]>([]);
  // When the current recording segment started
  const segmentStartRef = useRef<number | null>(null);
  // When the first segment of this turn started (for elapsed time calc)
  const turnStartRef = useRef<number | null>(null);

  /**
   * Call when voice recording starts.
   */
  const onRecordingStart = useCallback(() => {
    const now = Date.now();
    segmentStartRef.current = now;
    if (turnStartRef.current === null) {
      turnStartRef.current = now;
    }
  }, []);

  /**
   * Call when voice recording ends and transcript is received.
   * @param transcript - The final transcript text from this segment
   */
  const onRecordingEnd = useCallback((transcript: string) => {
    const endTime = Date.now();
    const startTime = segmentStartRef.current;
    if (startTime === null) return;

    const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
    const durationMs = endTime - startTime;

    segmentsRef.current.push({
      startTime,
      endTime,
      wordCount,
      durationMs,
    });

    segmentStartRef.current = null;
  }, []);

  /**
   * Compute metrics for the current turn and reset.
   * Call this when the user submits their turn.
   * @returns SpeechMetrics or null if no segments recorded (text-only input)
   */
  const finalizeTurn = useCallback((): SpeechMetrics | null => {
    const segments = segmentsRef.current;
    if (segments.length === 0) {
      // Reset
      segmentsRef.current = [];
      segmentStartRef.current = null;
      turnStartRef.current = null;
      return null; // Text-only input — no timing data
    }

    const totalSpeakingMs = segments.reduce((sum, s) => sum + s.durationMs, 0);
    const totalWords = segments.reduce((sum, s) => sum + s.wordCount, 0);
    const wordsPerMinute = totalSpeakingMs > 0
      ? Math.round((totalWords / totalSpeakingMs) * 60000)
      : 0;

    // Gaps between consecutive segments
    const gaps: number[] = [];
    for (let i = 1; i < segments.length; i++) {
      const gap = segments[i].startTime - segments[i - 1].endTime;
      if (gap > 0) gaps.push(gap);
    }

    const pauseCount = gaps.filter(g => g > 1000).length; // Only count gaps > 1s as pauses
    const longestPauseMs = gaps.length > 0 ? Math.max(...gaps) : 0;

    // Speaking ratio: speaking time vs total elapsed time
    const totalElapsedMs = segments[segments.length - 1].endTime - segments[0].startTime;
    const speakingRatio = totalElapsedMs > 0
      ? Math.round((totalSpeakingMs / totalElapsedMs) * 100) / 100
      : 1.0;

    // Reset for next turn
    segmentsRef.current = [];
    segmentStartRef.current = null;
    turnStartRef.current = null;

    return {
      totalDurationMs: totalSpeakingMs,
      wordsPerMinute,
      pauseCount,
      longestPauseMs,
      segmentCount: segments.length,
      speakingRatio,
    };
  }, []);

  /**
   * Reset without producing metrics (e.g., on cancel).
   */
  const reset = useCallback(() => {
    segmentsRef.current = [];
    segmentStartRef.current = null;
    turnStartRef.current = null;
  }, []);

  /**
   * Get current speaking duration in ms (for Part 2 duration check).
   */
  const getCurrentSpeakingDurationMs = useCallback((): number => {
    const segments = segmentsRef.current;
    let total = segments.reduce((sum, s) => sum + s.durationMs, 0);
    // Include current active segment
    if (segmentStartRef.current !== null) {
      total += Date.now() - segmentStartRef.current;
    }
    return total;
  }, []);

  return {
    onRecordingStart,
    onRecordingEnd,
    finalizeTurn,
    reset,
    getCurrentSpeakingDurationMs,
  };
}
