"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";

/* ══════════════════════════════════════════════════════════════════════
   Onboarding — First-time user welcome flow (3 screens)
   ══════════════════════════════════════════════════════════════════════
   Shows once per device. Uses localStorage key "lingona-onboarding-done"
   to track whether the user has already seen it.

   Screens:
     1. Welcome — mascot introduction
     2. How it works — 3 feature highlights
     3. Get started — final CTA
   ══════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = "lingona-onboarding-done";
const TOTAL_STEPS = 3;

/* ── Feature highlights for screen 2 ──────────────────────────────── */
const features = [
  {
    icon: "\uD83C\uDFA4",
    title: "Speak freely",
    description: "Practice with AI conversations in real scenarios",
  },
  {
    icon: "\uD83D\uDCCA",
    title: "Get feedback",
    description: "Pronunciation scoring and tips after every session",
  },
  {
    icon: "\uD83C\uDFC6",
    title: "Level up",
    description: "Earn XP, badges, and track your progress",
  },
];

const Onboarding: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [animating, setAnimating] = useState(false);

  /* ── Check localStorage on mount ─────────────────────────────────── */
  // If the splash screen was just shown this session, delay onboarding
  // so they don't stack on top of each other (splash 1.8s + fade 0.4s).
  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      if (done) return;

      const splashJustShown = sessionStorage.getItem("lingona-splash-shown");
      const delay = splashJustShown ? 2400 : 0;

      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    } catch {
      // localStorage unavailable — don't show onboarding
    }
  }, []);

  /* ── Navigation handlers ─────────────────────────────────────────── */
  const goNext = useCallback(() => {
    if (animating) return;
    if (step < TOTAL_STEPS - 1) {
      setDirection("next");
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => s + 1);
        setAnimating(false);
      }, 300);
    }
  }, [step, animating]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Ignore write errors
    }
    setVisible(false);
  }, []);

  if (!visible) return null;

  /* ── Slide transform ─────────────────────────────────────────────── */
  const getSlideStyle = (index: number): React.CSSProperties => {
    const offset = index - step;
    const translateX = animating
      ? direction === "next"
        ? `${(offset + 1) * 100}%`
        : `${(offset - 1) * 100}%`
      : `${offset * 100}%`;

    return {
      transform: `translateX(${translateX})`,
      transition: animating ? "transform 0.3s ease-in-out" : "none",
      position: "absolute" as const,
      inset: 0,
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem 1.5rem",
    };
  };

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center"
      style={{
        background: `
          radial-gradient(ellipse at 50% 40%, var(--color-primary-soft, rgba(99,102,241,0.08)) 0%, transparent 70%),
          var(--color-bg)
        `,
      }}
    >
      {/* ── Slides container ─────────────────────────────────────────── */}
      <div className="relative w-full max-w-md mx-auto" style={{ height: "70vh", maxHeight: 520 }}>
        <div className="relative w-full h-full overflow-hidden">

          {/* ── Screen 1: Welcome ────────────────────────────────────── */}
          <div style={getSlideStyle(0)}>
            <div className="flex flex-col items-center text-center gap-6">
              <Mascot size={140} mood="happy" />
              <div className="flex flex-col gap-3">
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  Meet your study buddy!
                </h1>
                <p
                  className="text-base leading-relaxed max-w-xs mx-auto"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Lingona helps you practice English speaking with AI — from
                  daily conversations to IELTS prep.
                </p>
              </div>
              <div className="mt-4 w-48">
                <Button variant="primary" size="lg" fullWidth onClick={goNext}>
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* ── Screen 2: How it works ───────────────────────────────── */}
          <div style={getSlideStyle(1)}>
            <div className="flex flex-col items-center text-center gap-6 w-full">
              <h2
                className="text-xl font-bold"
                style={{ color: "var(--color-text)" }}
              >
                How it works
              </h2>
              <div className="flex flex-col gap-5 w-full max-w-xs">
                {features.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-4 text-left rounded-xl p-4"
                    style={{
                      background: "var(--color-bg-card)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <span className="text-2xl flex-shrink-0 mt-0.5">
                      {f.icon}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: "var(--color-text)" }}
                      >
                        {f.title}
                      </span>
                      <span
                        className="text-xs leading-relaxed"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        {f.description}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 w-48">
                <Button variant="primary" size="lg" fullWidth onClick={goNext}>
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* ── Screen 3: Get started ────────────────────────────────── */}
          <div style={getSlideStyle(2)}>
            <div className="flex flex-col items-center text-center gap-6">
              <Mascot size={100} mood="happy" />
              <div className="flex flex-col gap-3">
                <h1
                  className="text-2xl font-bold"
                  style={{ color: "var(--color-text)" }}
                >
                  Ready to start speaking?
                </h1>
                <p
                  className="text-base leading-relaxed max-w-xs mx-auto"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Your first lesson takes less than 5 minutes.
                </p>
              </div>
              <div className="mt-4 w-full max-w-xs">
                <Button variant="primary" size="lg" fullWidth onClick={finish}>
                  Let&apos;s go!
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Skip button ───────────────────────────────────────────────── */}
      <button
        onClick={finish}
        className="absolute top-6 right-6 text-sm transition-colors"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Skip
      </button>

      {/* ── Step indicator dots ───────────────────────────────────────── */}
      <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className="rounded-full transition duration-300"
            style={{
              width: i === step ? 24 : 8,
              height: 8,
              background:
                i === step
                  ? "var(--color-primary)"
                  : "var(--color-text-tertiary, var(--color-text-secondary))",
              opacity: i === step ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default Onboarding;
