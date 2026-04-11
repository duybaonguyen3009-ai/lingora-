"use client";

/**
 * ExamScreen.tsx — IELTS exam hub with navy/teal design
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IconMic, IconHeadphones, IconOpenBook, IconPen } from "./Icons";
import Badge from "@/components/ui/Badge";
import { getScenarios } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { Scenario } from "@/lib/types";

interface ExamScreenProps {
  onStartIelts: (scenario: Scenario) => void;
  onStartWriting: () => void;
  onStartReading: () => void;
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
    accentColor: "#00A896",
    duration: "11-14 min",
  },
  {
    id: "listening",
    title: "IELTS Listening",
    subtitle: "Audio-based comprehension practice",
    Icon: IconHeadphones,
    available: false,
    accentColor: "#2D4A7A",
    duration: "30 min",
  },
  {
    id: "reading",
    title: "IELTS Reading",
    subtitle: "Practice passages with MCQ, T/F/NG & matching",
    Icon: IconOpenBook,
    available: true,
    accentColor: "#22C55E",
    duration: "60 min",
  },
  {
    id: "writing",
    title: "IELTS Writing",
    subtitle: "Task 1 & Task 2 essay practice with AI scoring",
    Icon: IconPen,
    available: true,
    accentColor: "#F59E0B",
    duration: "60 min",
  },
];

export default function ExamScreen({ onStartIelts, onStartWriting, onStartReading }: ExamScreenProps) {
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
          className="text-2xl font-display font-bold"
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
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-normal hover:shadow-md"
          style={{
            background: "rgba(0,168,150,0.06)",
            border: "1px solid rgba(0,168,150,0.15)",
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0,168,150,0.10)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="flex-1">
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Sign in to start exam practice
            </span>
            <span className="block text-xs" style={{ color: "var(--color-text-secondary)" }}>
              Create a free account to track your progress
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A896" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}

      {/* Available exam modules */}
      {EXAM_MODULES.filter(m => m.available).map((mod) => {
        const isLoading = mod.id === "speaking" && loading;
        return (
          <button
            key={mod.id}
            onClick={() => {
              if (!isAuthenticated) { router.push("/login"); return; }
              if (mod.id === "writing") { onStartWriting(); return; }
              if (mod.id === "reading") { onStartReading(); return; }
              if (ieltsScenario) handleStartExam(ieltsScenario);
            }}
            disabled={isLoading || (mod.id === "speaking" && !ieltsScenario)}
            className="relative overflow-hidden rounded-lg p-5 text-left transition-all duration-normal card-hover disabled:cursor-default disabled:hover:transform-none"
            style={{
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              borderLeft: `4px solid ${mod.accentColor}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${mod.accentColor}15`,
                  color: mod.accentColor,
                }}
              >
                <mod.Icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-base mb-0.5" style={{ color: "var(--color-text)" }}>
                  {mod.title}
                </div>
                <p className="text-sm leading-relaxed mb-2.5" style={{ color: "var(--color-text-secondary)" }}>
                  {mod.subtitle}
                </p>
                <div className="flex items-center gap-3">
                  <Badge variant="primary" size="md">{mod.duration}</Badge>
                  <Badge variant="primary" size="md">3 parts</Badge>
                </div>
              </div>
              <svg
                width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: mod.accentColor }}
                className="shrink-0 mt-1 transition-transform duration-normal group-hover:translate-x-1"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        );
      })}

      {/* Coming soon modules */}
      <div>
        <div
          className="text-xs font-bold uppercase tracking-[1.5px] mb-3"
          style={{ color: "var(--color-text-tertiary)", letterSpacing: "1.5px" }}
        >
          Coming Soon
        </div>
        <div className="flex flex-col gap-2.5">
          {EXAM_MODULES.filter(m => !m.available).map((mod) => (
            <div
              key={mod.id}
              className="flex items-center gap-3.5 p-3.5 rounded-lg"
              style={{
                background: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                opacity: 0.55,
              }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "var(--color-primary-soft)", color: "var(--color-text-tertiary)" }}
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
