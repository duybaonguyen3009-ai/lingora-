"use client";

import { useEffect, useRef, useState } from "react";
import { IconPlay, IconArrowRight } from "./Icons";
import { mockCourse } from "@/lib/mockData";
import { cn } from "@/lib/utils";

const CIRCUMFERENCE = 283; // 2 * π * 45

export default function Hero() {
  const [progress, setProgress] = useState(0);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setProgress(mockCourse.unitProgress), 300);
    return () => clearTimeout(timer);
  }, []);

  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  return (
    <section className="relative rounded-lg p-7 overflow-hidden animate-fadeSlideUp"
      style={{
        background: "linear-gradient(135deg, #1B2B4B 0%, #2D4A7A 60%, #1B2B4B 100%)",
        border: "1px solid rgba(0,168,150,0.15)",
      }}
    >
      {/* Grid decoration */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(0,168,150,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,168,150,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Ambient glow top-right */}
      <div className="absolute -top-16 -right-16 w-60 h-60 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,168,150,0.15) 0%, transparent 65%)" }}
      />
      {/* Ambient glow bottom-center */}
      <div className="absolute -bottom-8 left-[30%] w-40 h-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,196,176,0.08) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Body */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium tracking-[1px] uppercase" style={{ color: "#00C4B0" }}>
            <span className="inline-block w-5 h-[1.5px]" style={{ background: "#00C4B0" }} />
            Good morning, Anh
          </div>

          <h2 className="font-display font-bold text-xl leading-[1.2] tracking-[-0.5px] mb-2 text-white">
            Continue where<br />you <span style={{ color: "#00C4B0" }}>left off</span>
          </h2>

          <div className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg mb-4" style={{ background: "rgba(0,168,150,0.15)", border: "1px solid rgba(0,168,150,0.25)", color: "#00C4B0" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            {mockCourse.name} · {mockCourse.difficulty}
          </div>

          <p className="text-xs italic leading-[1.4] mb-5 max-w-[380px] text-white/40">
            &ldquo;Consistency is the key to mastery. Every lesson you complete moves you closer to fluency.&rdquo;
          </p>

          <button
            className={cn(
              "inline-flex items-center gap-2 px-6 py-3 rounded-full",
              "font-sans font-bold text-sm tracking-[0.2px]",
              "transition-all duration-normal",
              "hover:-translate-y-[2px]"
            )}
            style={{ boxShadow: "0 4px 24px rgba(0,168,150,0.35)", color: "#1B2B4B", background: "#00C4B0" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,168,150,0.45)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,168,150,0.35)")}
          >
            <IconPlay size={16} />
            Continue Learning
            <IconArrowRight />
          </button>
        </div>

        {/* Progress ring */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div className="relative w-[110px] h-[110px]">
            <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
              {/* Background ring */}
              <circle cx="55" cy="55" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              {/* Progress ring */}
              <circle
                ref={ringRef}
                cx="55" cy="55" r="45"
                fill="none"
                stroke="url(#heroRingGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                style={{
                  transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)",
                  filter: "drop-shadow(0 0 6px rgba(0,168,150,0.5))",
                }}
              />
              <defs>
                <linearGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#00A896" />
                  <stop offset="100%" stopColor="#00C4B0" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display font-bold text-xl leading-none text-white">{progress}%</span>
              <span className="text-xs uppercase tracking-[0.5px] mt-1 text-white/40">Unit progress</span>
            </div>
          </div>
          <div className="text-center">
            <div className="font-display font-bold text-sm text-white">
              Lesson {mockCourse.currentLesson} of {mockCourse.totalLessons}
            </div>
            <div className="text-xs mt-0.5 text-white/40">Next: Present Perfect in Context</div>
          </div>
        </div>
      </div>
    </section>
  );
}
