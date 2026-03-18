"use client";

import { useEffect, useState, useRef } from "react";
import LingonaLogo from "./LingonaLogo";

const BRAND_NAME = "LINGONA";
const TOTAL_DURATION = 3200; // total splash ms before fade-out starts
const FADE_OUT_DURATION = 600;

// Floating particle component
function Particle({ delay, x, size, color }: { delay: number; x: number; size: number; color: string }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: "-10px",
        backgroundColor: color,
        opacity: 0,
        animation: `splashParticleFloat 2.5s ease-out ${delay}s forwards`,
      }}
    />
  );
}

// Orbiting ring around the logo
function OrbitRing({ delay, size, duration }: { delay: number; size: number; duration: number }) {
  return (
    <div
      className="absolute rounded-full border"
      style={{
        width: size,
        height: size,
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) scale(0)",
        borderColor: "var(--color-primary-glow)",
        opacity: 0,
        animation: `splashOrbitExpand ${duration}s ease-out ${delay}s forwards`,
      }}
    />
  );
}

export default function SplashScreen() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const containerRef = useRef<HTMLDivElement>(null);

  // Effect 1: decide whether to show the splash (sessionStorage gate)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("lingona-splash-shown")) return;
    sessionStorage.setItem("lingona-splash-shown", "1");
    setShow(true);
  }, []);

  // Effect 2: run timers only when splash is visible
  // Kept separate so React Strict Mode's cleanup+re-run doesn't kill the timers
  // before the sessionStorage gate has already fired.
  useEffect(() => {
    if (!show) return;

    const holdTimer = setTimeout(() => setPhase("hold"), 800);
    const exitTimer = setTimeout(() => setPhase("exit"), TOTAL_DURATION);
    const hideTimer = setTimeout(() => setShow(false), TOTAL_DURATION + FADE_OUT_DURATION);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, [show]);

  if (!show) return null;

  // Generate particles
  const particles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    delay: 0.2 + Math.random() * 1.2,
    x: 8 + Math.random() * 84,
    size: 4 + Math.random() * 8,
    color:
      i % 3 === 0
        ? "var(--color-primary)"
        : i % 3 === 1
        ? "var(--color-accent)"
        : "var(--color-success)",
  }));

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        backgroundColor: "var(--color-bg)",
        animation: phase === "exit" ? `splashCurtainExit ${FADE_OUT_DURATION}ms ease-in forwards` : undefined,
      }}
    >
      {/* Background gradient pulse */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, var(--color-primary-glow) 0%, transparent 60%)`,
          opacity: 0,
          animation: "splashBgPulse 2.5s ease-in-out 0.3s forwards",
        }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <Particle key={p.id} delay={p.delay} x={p.x} size={p.size} color={p.color} />
      ))}

      {/* Logo container with orbit rings */}
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {/* Orbit rings */}
        <OrbitRing delay={0.4} size={130} duration={1.8} />
        <OrbitRing delay={0.6} size={170} duration={2.0} />
        <OrbitRing delay={0.8} size={210} duration={2.2} />

        {/* Logo — bouncy drop-in */}
        <div
          className="relative z-10"
          style={{
            opacity: 0,
            animation: "splashLogoDrop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards",
          }}
        >
          <LingonaLogo size={100} className="rounded-[22px]" />
        </div>

        {/* Glow behind logo */}
        <div
          className="absolute z-[5] rounded-full"
          style={{
            width: 90,
            height: 90,
            background: `radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%)`,
            opacity: 0,
            animation: "splashGlow 1.5s ease-out 0.5s forwards",
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Brand name — letter by letter reveal */}
      <div className="flex gap-[3px] mt-5 overflow-hidden">
        {BRAND_NAME.split("").map((letter, i) => (
          <span
            key={i}
            className="font-sora font-black text-[28px] tracking-[4px]"
            style={{
              opacity: 0,
              display: "inline-block",
              animation: `splashLetterReveal 0.4s cubic-bezier(0.22, 1, 0.36, 1) ${0.9 + i * 0.06}s forwards`,
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
        className="text-[13px] mt-2 tracking-[2px] uppercase font-medium"
        style={{
          color: "var(--color-text-secondary)",
          opacity: 0,
          animation: "splashFadeSlideUp 0.6s ease-out 1.6s forwards",
        }}
      >
        Speak English Naturally
      </p>

      {/* Bottom loading bar */}
      <div
        className="absolute bottom-12 overflow-hidden rounded-full"
        style={{
          width: 120,
          height: 3,
          backgroundColor: "var(--color-border)",
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, var(--color-primary), var(--color-accent))",
            animation: `splashLoadingBar ${TOTAL_DURATION - 200}ms ease-in-out 0.3s forwards`,
          }}
        />
      </div>
    </div>
  );
}
