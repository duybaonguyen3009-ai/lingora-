"use client";

import { useEffect, useState } from "react";
import Mascot from "@/components/ui/Mascot";

const BRAND_NAME = "LINGONA";
const TOTAL_DURATION = 1800; // 1.8s total — fast, memorable, not annoying
const FADE_OUT_DURATION = 400;

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"enter" | "exit">("enter");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("lingona-splash-shown")) return;
    sessionStorage.setItem("lingona-splash-shown", "1");
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const exitTimer = setTimeout(() => setPhase("exit"), TOTAL_DURATION);
    const hideTimer = setTimeout(() => setShow(false), TOTAL_DURATION + FADE_OUT_DURATION);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-splash flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg)",
        animation: phase === "exit" ? `splashCurtainExit ${FADE_OUT_DURATION}ms ease-in forwards` : undefined,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 42%, var(--color-primary-glow) 0%, transparent 55%)",
          opacity: 0,
          animation: "splashBgPulse 1.5s ease-in-out 0.1s forwards",
        }}
      />

      {/* Mascot — bouncy drop-in, BIG and centered */}
      <div
        style={{
          opacity: 0,
          animation: "splashLogoDrop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards",
        }}
      >
        <Mascot size={160} />
      </div>

      {/* Brand name — letter by letter reveal */}
      <div className="flex gap-1 mt-6 overflow-hidden">
        {BRAND_NAME.split("").map((letter, i) => (
          <span
            key={i}
            className="font-sora font-black text-xl tracking-[4px]"
            style={{
              opacity: 0,
              display: "inline-block",
              animation: `splashLetterReveal 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${0.5 + i * 0.04}s forwards`,
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Tagline */}
      <p
        className="text-sm mt-2 tracking-[2px] uppercase font-medium"
        style={{
          color: "var(--color-text-secondary)",
          opacity: 0,
          animation: "splashFadeSlideUp 0.5s ease-out 0.9s forwards",
        }}
      >
        Speak English Naturally
      </p>

      {/* Bottom loading bar */}
      <div
        className="absolute bottom-12 overflow-hidden rounded-full"
        style={{ width: 120, height: 3, backgroundColor: "var(--color-border)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
            animation: `splashLoadingBar ${TOTAL_DURATION - 100}ms ease-in-out 0.1s forwards`,
          }}
        />
      </div>
    </div>
  );
}
