"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

type RecorderState = "idle" | "requesting" | "recording" | "stopped";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

export default function AudioRecorder({
  onRecordingComplete,
  disabled = false,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [permError, setPermError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled) return;
    setPermError(null);
    setState("requesting");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorder.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunks.current, { type: mimeType });
        chunks.current = [];
        onRecordingComplete(blob);
        setState("stopped");
      };

      recorder.start(250);
      setState("recording");
      setElapsed(0);

      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 200);
    } catch (err) {
      setState("idle");
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPermError("Microphone access denied. Please allow microphone access in your browser settings.");
      } else {
        setPermError("Could not access microphone. Please check your device settings.");
      }
    }
  }, [disabled, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mic button — 64px, primary color */}
      <button
        onClick={state === "recording" ? stopRecording : startRecording}
        disabled={disabled || state === "requesting" || state === "stopped"}
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-300",
          state === "recording"
            ? "w-16 h-16 border-2 border-red-400"
            : "w-16 h-16 border-2"
        )}
        style={{
          backgroundColor:
            state === "recording"
              ? "rgba(239,68,68,0.15)"
              : disabled || state === "stopped"
              ? "var(--color-border)"
              : "var(--color-primary-soft)",
          borderColor:
            state === "recording"
              ? undefined
              : state === "requesting"
              ? "var(--color-primary-glow)"
              : disabled || state === "stopped"
              ? "var(--color-border)"
              : "var(--color-primary-glow)",
          opacity: disabled || state === "stopped" ? 0.5 : 1,
          cursor: disabled || state === "stopped" ? "not-allowed" : state === "requesting" ? "wait" : "pointer",
        }}
      >
        {state === "recording" && (
          <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
        )}

        {state === "recording" ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-400">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: "var(--color-primary)" }}>
            <path
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z"
              fill="currentColor"
              opacity="0.2"
            />
            <path
              d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4m-4 0h8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Label */}
      <div className="text-center">
        {state === "idle" && !permError && (
          <p className="text-[13px]" style={{ color: "var(--color-text-secondary)" }}>Tap to Record</p>
        )}
        {state === "requesting" && (
          <p className="text-[13px] animate-pulse" style={{ color: "var(--color-primary)" }}>Requesting mic access…</p>
        )}
        {state === "recording" && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[15px] font-bold text-red-400 tabular-nums">
              {formatTime(elapsed)}
            </p>
            <p className="text-[12px]" style={{ color: "var(--color-text-secondary)" }}>Tap to Stop</p>
          </div>
        )}
        {state === "stopped" && (
          <p className="text-[13px]" style={{ color: "var(--color-success)" }}>Processing…</p>
        )}
        {permError && (
          <p className="text-[12px] text-red-400 max-w-[260px]">{permError}</p>
        )}
      </div>
    </div>
  );
}
