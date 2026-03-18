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
    <section className="relative rounded-[16px] p-7 overflow-hidden animate-fadeSlideUp animate-delay-1"
      style={{
        background: "linear-gradient(135deg, #0D2840 0%, #0a1f36 60%, #071829 100%)",
        border: "1px solid rgba(45,168,255,0.15)",
      }}
    >
      {/* Grid decoration */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(45,168,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(45,168,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Ambient glow top-right */}
      <div className="absolute -top-16 -right-16 w-60 h-60 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(45,168,255,0.12) 0%, transparent 65%)" }}
      />
      {/* Ambient glow bottom-center */}
      <div className="absolute -bottom-8 left-[30%] w-40 h-40 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(46,211,198,0.07) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6">
        {/* Body */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 text-[12px] font-medium text-[#2DA8FF] tracking-[1px] uppercase">
            <span className="inline-block w-5 h-[1.5px] bg-[#2DA8FF]" />
            Good morning, Anh
          </div>

          <h2 className="font-sora font-black text-[26px] leading-[1.2] tracking-[-0.5px] mb-2">
            Continue where<br />you <span className="text-[#2ED3C6]">left off</span>
          </h2>

          <div className="inline-flex items-center gap-[5px] bg-[#2DA8FF]/12 border border-[#2DA8FF]/20 text-[#2DA8FF] text-[11px] font-semibold px-[10px] py-1 rounded-[20px] mb-[18px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            {mockCourse.name} · {mockCourse.difficulty}
          </div>

          <p className="text-[12.5px] text-[#A6B3C2] italic leading-[1.4] mb-5 max-w-[380px]">
            &ldquo;Consistency is the key to mastery. Every lesson you complete moves you closer to fluency.&rdquo;
          </p>

          <button
            className={cn(
              "inline-flex items-center gap-2 px-6 py-[13px] rounded-[12px]",
              "font-sora font-bold text-[13.5px] tracking-[0.2px] text-[#071A2F]",
              "bg-[#2ED3C6] transition-all duration-200",
              "hover:-translate-y-[2px]"
            )}
            style={{ boxShadow: "0 4px 24px rgba(46,211,198,0.35)" }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 8px 32px rgba(46,211,198,0.45)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(46,211,198,0.35)")}
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
                  filter: "drop-shadow(0 0 6px rgba(46,211,198,0.5))",
                }}
              />
              <defs>
                <linearGradient id="heroRingGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2ED3C6" />
                  <stop offset="100%" stopColor="#2DA8FF" />
                </linearGradient>
              </defs>
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-sora font-black text-[22px] text-[#E6EDF3] leading-none">{progress}%</span>
              <span className="text-[9px] text-[#A6B3C2] uppercase tracking-[0.5px] mt-[3px]">Unit progress</span>
            </div>
          </div>
          <div className="text-center">
            <div className="font-sora font-bold text-[13px] text-[#E6EDF3]">
              Lesson {mockCourse.currentLesson} of {mockCourse.totalLessons}
            </div>
            <div className="text-[11px] text-[#A6B3C2] mt-0.5">Next: Present Perfect in Context</div>
          </div>
        </div>
      </div>
    </section>
  );
}
