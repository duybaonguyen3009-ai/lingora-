"use client";

/**
 * ExamScreen.tsx
 *
 * IELTS exam hub — shows available exam modules with a focused,
 * exam-appropriate design. Not just a list of cards — it should
 * feel like you're about to enter a real test environment.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconMic, IconHeadphones, IconOpenBook, IconPen } from "./Icons";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { getScenarios } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { Scenario } from "@/lib/types";

interface ExamScreenProps {
  onStartIelts: (scenario: Scenario) => void;
}

interface ExamModule {
  id: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  available: boolean;
  accentColor: string;
  duration: string;
}

const EXAM_MODULES: ExamModule[] = [
  {
    id: "speaking",
    title: "IELTS Speaking",
    subtitle: "Full 3-part speaking test with AI examiner",
    Icon: IconMic,
    available: true,
    accentColor: "#7C5CFC",
    duration: "11–14 min",
  },
  {
    id: "listening",
    title: "IELTS Listening",
    subtitle: "Audio-based comprehension practice",
    Icon: IconHeadphones,
    available: false,
    accentColor: "#38BDF8",
    duration: "30 min",
  },
  {
    id: "reading",
    title: "IELTS Reading",
    subtitle: "Passage analysis and question practice",
    Icon: IconOpenBook,
    available: false,
    accentColor: "#34D399",
    duration: "60 min",
  },
  {
    id: "writing",
    title: "IELTS Writing",
    subtitle: "Task 1 & Task 2 essay practice with scoring",
    Icon: IconPen,
    available: false,
    accentColor: "#FBBF24",
    duration: "60 min",
  },
];

export default function ExamScreen({ onStartIelts }: ExamScreenProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const authReady = !useAuthStore((s) => s.isLoading);
  const [ieltsScenario, setIeltsScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getScenarios("exam")
      .then((scenarios) => {
        if (cancelled) return;
        const ielts = scenarios.find((s) => s.exam_type === "ielts");
        if (ielts) setIeltsScenario(ielts);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  /** Gate exam start behind authentication */
  function handleStartExam(scenario: Scenario) {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    onStartIelts(scenario);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2
          className="text-xl font-sora font-bold"
          style={{ color: "var(--color-text)" }}
        >
          Exam Practice
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Simulate real exam conditions with AI-powered assessment
        </p>
      </div>

      {/* Auth prompt for guests */}
      {authReady && !isAuthenticated && (
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-normal hover:scale-[1.01]"
          style={{
            background: "var(--color-examiner)12",
            border: "1px solid var(--color-examiner)30",
          }}
        >
          <span className="text-lg">🔒</span>
          <div className="flex-1">
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Sign in to start exam practice
            </span>
            <span className="block text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Create a free account to track your progress
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-examiner)" }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* IELTS Speaking — featured card */}
      {EXAM_MODULES.filter(m => m.available).map((mod) => {
        const isLoading = mod.id === "speaking" && loading;
        return (
          <button
            key={mod.id}
            onClick={() => {
              if (ieltsScenario) handleStartExam(ieltsScenario);
            }}
            disabled={isLoading || (mod.id === "speaking" && !ieltsScenario)}
            className="relative overflow-hidden rounded-lg p-5 text-left transition-all duration-normal card-hover disabled:cursor-default disabled:hover:transform-none"
            style={{
              background: `linear-gradient(135deg, ${mod.accentColor}15 0%, var(--color-bg-card) 100%)`,
              border: `1px solid ${mod.accentColor}30`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: `${mod.accentColor}18`,
                  color: mod.accentColor,
                }}
              >
                <mod.Icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-sora font-bold text-base mb-0.5" style={{ color: "var(--color-text)" }}>
                  {mod.title}
                </div>
                <p className="text-sm leading-relaxed mb-2.5" style={{ color: "var(--color-text-secondary)" }}>
                  {mod.subtitle}
                </p>
                <div className="flex items-center gap-3">
                  <Badge variant="info" size="md">{mod.duration}</Badge>
                  <Badge variant="info" size="md">3 parts</Badge>
                </div>
              </div>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: mod.accentColor }}
                className="shrink-0 mt-1"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        );
      })}

      {/* Coming soon modules */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Coming Soon
        </div>
        <div className="flex flex-col gap-2.5">
          {EXAM_MODULES.filter(m => !m.available).map((mod) => (
            <div
              key={mod.id}
              className="flex items-center gap-3.5 p-3.5 rounded-xl"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                opacity: 0.5,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--color-primary-soft)", color: "var(--color-text-secondary)" }}
              >
                <mod.Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                  {mod.title}
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {mod.duration}
                </div>
              </div>
              <Badge variant="muted" size="sm">Soon</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
