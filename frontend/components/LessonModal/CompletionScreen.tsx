"use client";

import { useEffect, useState } from "react";

interface CompletionScreenProps {
  lessonTitle: string;
  xpEarned: number;
  quizScore: number; // 0-100
  onClose: () => void;
}

export default function CompletionScreen({
  lessonTitle,
  xpEarned,
  quizScore,
  onClose,
}: CompletionScreenProps) {
  const [show, setShow] = useState(false);

  // Animate in after mount
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(t);
  }, []);

  const grade =
    quizScore >= 80 ? { label: "Excellent!", color: "text-emerald-400" }
    : quizScore >= 60 ? { label: "Good job!", color: "text-[#2ED3C6]" }
    : { label: "Keep going!", color: "text-amber-400" };

  return (
    <div
      className="flex flex-col items-center gap-6 py-4 transition-all duration-500"
      style={{ opacity: show ? 1 : 0, transform: show ? "translateY(0)" : "translateY(12px)" }}
    >
      {/* Trophy */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
        style={{
          background: "linear-gradient(135deg, #2ED3C6, #2DA8FF)",
          boxShadow: "0 0 40px rgba(46,211,198,0.4)",
        }}
      >
        🏆
      </div>

      <div className="text-center">
        <p className="text-[22px] font-sora font-bold text-[#E6EDF3]">Lesson Complete!</p>
        <p className="text-[13px] text-[#A6B3C2] mt-1">{lessonTitle}</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 w-full max-w-[300px]">
        <div className="flex-1 rounded-xl border border-[#2ED3C6]/20 bg-[#2ED3C6]/[0.07] p-4 text-center">
          <p className="text-[26px] font-bold text-[#2ED3C6]">+{xpEarned}</p>
          <p className="text-[11px] text-[#A6B3C2] mt-0.5">XP Earned</p>
        </div>
        <div className="flex-1 rounded-xl border border-[#2DA8FF]/20 bg-[#2DA8FF]/[0.07] p-4 text-center">
          <p className={`text-[26px] font-bold ${grade.color}`}>{quizScore}%</p>
          <p className="text-[11px] text-[#A6B3C2] mt-0.5">Quiz Score</p>
        </div>
      </div>

      <p className={`text-[16px] font-semibold ${grade.color}`}>{grade.label}</p>

      <button
        onClick={onClose}
        className="w-full max-w-[300px] py-3.5 rounded-xl font-semibold text-[15px] text-[#071A2F] hover:opacity-90 transition-all duration-200"
        style={{ background: "linear-gradient(135deg, #2ED3C6, #2DA8FF)" }}
      >
        Continue
      </button>
    </div>
  );
}
