"use client";

/**
 * ScenarioConversation.tsx
 *
 * AI role-play conversation for speaking practice scenarios.
 * Designed as a guided speaking session — AI partner + your responses,
 * not a generic chat app.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  startScenarioSession,
  submitScenarioTurn,
  endScenarioSession,
} from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type {
  Scenario,
  ConversationTurn,
  EndSessionResult,
} from "@/lib/types";
import ScenarioSummary from "./ScenarioSummary";
import Button from "@/components/ui/Button";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import useSound from "@/hooks/useSound";

interface ScenarioConversationProps {
  scenario: Scenario;
  onClose: () => void;
  onComplete?: () => void;
}

type Phase = "loading" | "conversation" | "ending" | "summary" | "error";

// ── AI Partner Avatar ────────────────────────────────────────────────────────

function PartnerAvatar({ speaking = false }: { speaking?: boolean }) {
  return (
    <div
      className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${speaking ? "animate-examiner-pulse" : ""}`}
      style={{
        background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </div>
  );
}

export default function ScenarioConversation({
  scenario,
  onClose,
  onComplete,
}: ScenarioConversationProps) {
  const router = useRouter();
  const { play } = useSound();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [phase, setPhase] = useState<Phase>("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<EndSessionResult | null>(null);
  const [startTime] = useState(() => Date.now());

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice input — populates inputText, user sends manually
  const voice = useVoiceInput(
    useCallback((transcript: string) => {
      setInputText((prev) => (prev ? prev + " " + transcript : transcript));
    }, [])
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns, sending]);

  // Start session on mount
  useEffect(() => {
    let cancelled = false;

    // Gate behind authentication
    if (!useAuthStore.getState().accessToken) {
      setError("Sign in to start a conversation and track your progress.");
      setPhase("error");
      return;
    }

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
        setError(err.message || "Hmm, something didn't work. Let's try again!");
        setPhase("error");
      });

    return () => { cancelled = true; };
  }, [scenario.id]);

  // Submit a user message
  const handleSend = useCallback(async () => {
    if (!sessionId || !inputText.trim() || sending) return;

    // Stop recording if active
    if (voice.isRecording) {
      voice.stopRecording();
    }

    const message = inputText.trim();
    setInputText("");
    setSending(true);

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
      play("ai", 0.3);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Message didn't go through — try sending again";
      setError(msg);
      setTurns((prev) => prev.filter((t) => t.id !== tempUserTurn.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [sessionId, inputText, sending, turns.length, voice]);

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
      const msg = err instanceof Error ? err.message : "Oops! We couldn't wrap up the session. Let's try that again";
      setError(msg);
      setPhase("error");
    }
  }, [sessionId, startTime, onComplete]);

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
        className="flex items-center gap-3 px-4 py-3 shrink-0"
      >
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
          </svg>
        </button>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <PartnerAvatar />
          <div className="min-w-0">
            <div style={{ color: "var(--color-text)" }} className="font-semibold text-sm truncate">
              {scenario.title}
            </div>
            <div style={{ color: "var(--color-text-secondary)" }} className="text-xs">
              {scenario.difficulty} · {scenario.category} · {userTurnCount} turns
            </div>
          </div>
        </div>
        {phase === "conversation" && userTurnCount >= 2 && (
          <Button
            variant="soft"
            size="sm"
            onClick={handleEndConversation}
          >
            End Session
          </Button>
        )}
      </div>

      {/* ── Conversation area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 py-5 space-y-4">
          {/* Loading */}
          {phase === "loading" && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-phase-in">
              <PartnerAvatar speaking />
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Starting conversation...</p>
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="text-2xl">{!isAuthenticated ? "🔒" : "⚠️"}</div>
              <div style={{ color: "var(--color-warning)" }} className="text-lg font-medium text-center">{error || "Oops! Let's try that again"}</div>
              <div className="flex gap-3">
                {!isAuthenticated && (
                  <Button
                    variant="success"
                    size="md"
                    onClick={() => router.push("/login")}
                  >
                    Sign In
                  </Button>
                )}
                <Button variant="ghost" size="md" onClick={onClose}>Go back</Button>
              </div>
            </div>
          )}

          {/* Ending */}
          {phase === "ending" && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-phase-in">
              <PartnerAvatar speaking />
              <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>Analysing your conversation...</p>
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
            </div>
          )}

          {/* Messages */}
          {(phase === "conversation" || phase === "ending") &&
            turns.map((turn) => (
              <div
                key={turn.id}
                className={`flex gap-2.5 animate-message-in ${turn.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {turn.role === "assistant" && <PartnerAvatar />}
                <div
                  style={{
                    background: turn.role === "user" ? "var(--color-primary)" : "var(--color-bg-card)",
                    color: turn.role === "user" ? "#fff" : "var(--color-text)",
                    border: turn.role === "assistant" ? "1px solid var(--color-border)" : "none",
                  }}
                  className={`max-w-[72%] px-4 py-3 text-base leading-relaxed ${
                    turn.role === "user" ? "rounded-lg rounded-br-md" : "rounded-lg rounded-bl-md"
                  }`}
                >
                  {turn.content}
                </div>
              </div>
            ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex gap-2.5 animate-message-in">
              <PartnerAvatar speaking />
              <div
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
                className="px-4 py-3 rounded-lg rounded-bl-md"
              >
                <div className="flex gap-1.5">
                  {[0, 200, 400].map((delay) => (
                    <span
                      key={delay}
                      style={{ background: "var(--color-text-secondary)", animationDelay: `${delay}ms` }}
                      className="w-2 h-2 rounded-full animate-typing-dot"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input area ── */}
      {phase === "conversation" && (
        <div
          style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}
          className="shrink-0"
        >
          <div className="max-w-xl mx-auto px-4 py-3.5">
            {userTurnCount < 2 && (
              <div style={{ color: "var(--color-text-secondary)" }} className="text-xs text-center mb-2">
                Reply at least 2 times to end the conversation
              </div>
            )}

            {/* Live transcript */}
            {voice.isRecording && voice.interimTranscript && (
              <div
                className="mb-2 px-3 py-2 rounded-xl text-sm italic"
                style={{ background: "var(--color-primary-soft)", color: "var(--color-text)" }}
              >
                {voice.interimTranscript}
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Mic button */}
              {voice.isSupported && (
                <div className="relative flex items-center justify-center">
                  {voice.isRecording && (
                    <div className="absolute inset-0 rounded-xl animate-recording-pulse" style={{ background: "rgba(239,68,68,0.15)" }} />
                  )}
                  <button
                    onClick={voice.isRecording ? voice.stopRecording : voice.startRecording}
                    disabled={sending}
                    title={voice.isRecording ? "Stop recording" : "Speak"}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                    style={{
                      background: voice.isRecording ? "linear-gradient(135deg, #ef4444, #dc2626)" : "var(--color-primary-soft)",
                      color: voice.isRecording ? "#fff" : "var(--color-primary)",
                    }}
                  >
                    {voice.isRecording ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3" /></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}

              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type or speak your reply..."
                rows={1}
                className="flex-1 resize-none rounded-xl px-3.5 py-2.5 text-base outline-none transition-colors placeholder:opacity-40"
                style={{
                  background: "var(--color-bg-secondary)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                }}
              />

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-normal disabled:opacity-30"
                style={{
                  background: inputText.trim() && !sending ? "var(--color-primary)" : "var(--color-border)",
                  color: inputText.trim() && !sending ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            {!voice.isSupported && (
              <p className="text-xs mt-2 px-3 py-1.5 rounded text-center" style={{ color: "var(--color-text-secondary)", backgroundColor: "var(--color-primary-soft)" }}>
                Voice input is not available in this browser. Use Chrome or Edge for the best experience, or type your answers below.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
