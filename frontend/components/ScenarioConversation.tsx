"use client";

/**
 * ScenarioConversation.tsx
 *
 * Full-screen conversation UI for AI role-play scenarios.
 * Premium chat-bubble layout with voice input support.
 * Scores hidden during conversation — only shown on session summary.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  startScenarioSession,
  submitScenarioTurn,
  endScenarioSession,
} from "@/lib/api";
import type {
  Scenario,
  ConversationTurn,
  EndSessionResult,
} from "@/lib/types";
import ScenarioSummary from "./ScenarioSummary";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface ScenarioConversationProps {
  scenario: Scenario;
  onClose: () => void;
  onComplete?: () => void;
}

type Phase = "loading" | "conversation" | "ending" | "summary" | "error";

export default function ScenarioConversation({
  scenario,
  onClose,
  onComplete,
}: ScenarioConversationProps) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EndSessionResult | null>(null);
  const [startTime] = useState(() => Date.now());

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice input — populates inputText, user sends manually
  const voice = useVoiceInput(
    useCallback((transcript: string) => {
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
    }, [])
  );

  // Auto-scroll to bottom on new turns
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, sending]);

  // Start session on mount
  useEffect(() => {
    let cancelled = false;

    startScenarioSession(scenario.id)
      .then((result) => {
        if (cancelled) return;
        setSessionId(result.sessionId);
        const mappedTurns: ConversationTurn[] = result.turns.map((t) => ({
          id: `init-${t.turnIndex}`,
          turnIndex: t.turnIndex,
          role: t.role,
          content: t.content,
          audioStorageKey: null,
          scores: null,
          feedback: null,
          createdAt: t.createdAt,
        }));
        setTurns(mappedTurns);
        setPhase("conversation");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to start session");
        setPhase("error");
      });

    return () => {
      cancelled = true;
    };
  }, [scenario.id]);

  // Submit a user message
  const handleSend = useCallback(async () => {
    if (!sessionId || !inputText.trim() || sending) return;

    const message = inputText.trim();
    setInputText("");
    setSending(true);

    // Optimistic: add user turn immediately
    const tempUserTurn: ConversationTurn = {
      id: `temp-${Date.now()}`,
      turnIndex: turns.length,
      role: "user",
      content: message,
      audioStorageKey: null,
      scores: null,
      feedback: null,
      createdAt: new Date().toISOString(),
    };
    setTurns((prev) => [...prev, tempUserTurn]);

    try {
      const result = await submitScenarioTurn(sessionId, message);
      setTurns((prev) => {
        const withoutTemp = prev.filter((t) => t.id !== tempUserTurn.id);
        return [
          ...withoutTemp,
          {
            id: `user-${result.userTurn.turnIndex}`,
            turnIndex: result.userTurn.turnIndex,
            role: result.userTurn.role,
            content: result.userTurn.content,
            audioStorageKey: null,
            scores: null,
            feedback: null,
            createdAt: result.userTurn.createdAt,
          },
          {
            id: `ai-${result.aiTurn.turnIndex}`,
            turnIndex: result.aiTurn.turnIndex,
            role: result.aiTurn.role,
            content: result.aiTurn.content,
            audioStorageKey: null,
            scores: null,
            feedback: null,
            createdAt: result.aiTurn.createdAt,
          },
        ];
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send message";
      setError(msg);
      setTurns((prev) => prev.filter((t) => t.id !== tempUserTurn.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [sessionId, inputText, sending, turns.length]);

  // End conversation and get scores
  const handleEndConversation = useCallback(async () => {
    if (!sessionId) return;
    setPhase("ending");

    try {
      const durationMs = Date.now() - startTime;
      const result = await endScenarioSession(sessionId, durationMs);
      setSummary(result);
      setPhase("summary");
      onComplete?.();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to end session";
      setError(msg);
      setPhase("error");
    }
  }, [sessionId, startTime, onComplete]);

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const userTurnCount = turns.filter((t) => t.role === "user").length;

  // Summary screen
  if (phase === "summary" && summary) {
    return <ScenarioSummary result={summary} onClose={onClose} />;
  }

  return (
    <div
      style={{ background: "var(--color-bg)" }}
      className="fixed inset-0 z-50 flex flex-col bg-speak"
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "var(--color-bg-card)",
          borderBottom: "1px solid var(--color-border)",
        }}
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
      >
        <button
          onClick={onClose}
          style={{ color: "var(--color-text-secondary)" }}
          className="text-xl hover:opacity-70 transition-opacity"
        >
          ✕
        </button>
        <div className="flex-1 min-w-0">
          <div
            style={{ color: "var(--color-text)" }}
            className="font-semibold text-[15px] truncate"
          >
            {scenario.emoji} {scenario.title}
          </div>
          <div
            style={{ color: "var(--color-text-secondary)" }}
            className="text-[12px]"
          >
            {scenario.difficulty} · {scenario.category}
          </div>
        </div>
        {phase === "conversation" && userTurnCount >= 2 && (
          <button
            onClick={handleEndConversation}
            style={{
              background: "var(--color-primary)",
              color: "#fff",
            }}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold hover:opacity-90 transition-opacity"
          >
            End Chat
          </button>
        )}
      </div>

      {/* ── Chat area ── */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {/* Loading state */}
        {phase === "loading" && (
          <div className="flex items-center justify-center h-full">
            <div
              style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }}
              className="w-8 h-8 border-2 rounded-full animate-spin"
            />
          </div>
        )}

        {/* Error state */}
        {phase === "error" && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div style={{ color: "var(--color-warning)" }} className="text-lg">
              {error || "Something went wrong"}
            </div>
            <button onClick={onClose} style={{ color: "var(--color-primary)" }} className="underline text-[15px]">
              Go back
            </button>
          </div>
        )}

        {/* Ending state */}
        {phase === "ending" && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div
              style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }}
              className="w-8 h-8 border-2 rounded-full animate-spin"
            />
            <div style={{ color: "var(--color-text-secondary)" }} className="text-[15px]">
              Analyzing your conversation...
            </div>
          </div>
        )}

        {/* Chat bubbles */}
        {(phase === "conversation" || phase === "ending") &&
          turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex animate-message-in ${turn.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                style={{
                  background:
                    turn.role === "user"
                      ? "var(--color-primary)"
                      : "var(--color-bg-card)",
                  color:
                    turn.role === "user" ? "#fff" : "var(--color-text)",
                  border:
                    turn.role === "assistant"
                      ? "1px solid var(--color-border)"
                      : "none",
                  borderLeft:
                    turn.role === "assistant"
                      ? "3px solid var(--color-accent)"
                      : "none",
                }}
                className={`max-w-[70%] px-4 py-3 text-[15px] leading-relaxed ${
                  turn.role === "user"
                    ? "rounded-2xl rounded-br-md"
                    : "rounded-2xl rounded-bl-md"
                }`}
              >
                {turn.content}
              </div>
            </div>
          ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start animate-message-in">
            <div
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
              }}
              className="px-4 py-3 rounded-2xl rounded-bl-md"
            >
              <div className="flex gap-1.5">
                {[0, 200, 400].map((delay) => (
                  <span
                    key={delay}
                    style={{
                      background: "var(--color-text-secondary)",
                      animationDelay: `${delay}ms`,
                    }}
                    className="w-2 h-2 rounded-full animate-typing-dot"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* ── Input area ── */}
      {phase === "conversation" && (
        <div
          style={{
            background: "var(--color-bg-card)",
            borderTop: "1px solid var(--color-border)",
          }}
          className="px-5 py-4 shrink-0"
        >
          {userTurnCount < 2 && (
            <div
              style={{ color: "var(--color-text-secondary)" }}
              className="text-[12px] text-center mb-3"
            >
              Reply at least 2 times before ending the chat
            </div>
          )}

          {/* Live transcript preview while recording */}
          {voice.isRecording && voice.interimTranscript && (
            <div
              className="mb-3 px-3 py-2 rounded-xl text-[13px] italic"
              style={{
                background: "var(--color-primary-soft)",
                color: "var(--color-text-secondary)",
                border: "1px solid var(--color-border)",
              }}
            >
              🎤 &ldquo;{voice.interimTranscript}&rdquo;
            </div>
          )}

          <div className="flex items-end gap-2.5">
            {/* Mic button */}
            {voice.isSupported && (
              <button
                onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                disabled={sending}
                title={voice.isRecording ? "Stop recording" : "Speak your answer"}
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50"
                style={{
                  background: voice.isRecording
                    ? "#ef4444"
                    : "var(--color-primary-soft)",
                  color: voice.isRecording ? "#fff" : "var(--color-primary)",
                  boxShadow: voice.isRecording
                    ? "0 0 12px rgba(239,68,68,0.3)"
                    : "none",
                }}
              >
                {voice.isRecording ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                )}
              </button>
            )}

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voice.isSupported ? "Type or use mic..." : "Type your reply..."}
              rows={1}
              disabled={sending}
              style={{
                background: "var(--color-primary-soft)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-[15px] outline-none focus:border-[color:var(--color-primary)] transition-colors placeholder:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              style={{
                background: inputText.trim() && !sending
                  ? "var(--color-primary)"
                  : "var(--color-border)",
                color: inputText.trim() && !sending
                  ? "#fff"
                  : "var(--color-text-secondary)",
              }}
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors disabled:opacity-50"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {!voice.isSupported && (
            <p className="text-[11px] mt-2 text-center" style={{ color: "var(--color-text-secondary)" }}>
              Voice input requires Chrome or Edge.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
