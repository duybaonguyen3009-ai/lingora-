"use client";

/**
 * ProSuccessScreen.tsx — Celebration screen after upgrade/trial activation.
 */

import { useEffect } from "react";

interface ProSuccessScreenProps {
  isTrial: boolean;
  onContinue: () => void;
}

const PERKS = [
  "Speaking AI không giới hạn",
  "Writing AI không giới hạn",
  "Phân tích chi tiết",
];

export default function ProSuccessScreen({ isTrial, onContinue }: ProSuccessScreenProps) {
  // Auto-redirect after 3 seconds
  useEffect(() => {
    const t = setTimeout(onContinue, 3000);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <div className="fixed inset-0 z-splash flex items-center justify-center p-4" style={{ background: "var(--color-bg)" }}>
      <div className="text-center max-w-sm">
        {/* Confetti-like dots */}
        <div className="relative mb-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full"
              style={{
                background: ["#8B71EA", "#2DD4BF", "#F59E0B", "#22C55E"][i % 4],
                left: `${50 + Math.cos(i * 30 * Math.PI / 180) * 40}%`,
                top: `${50 + Math.sin(i * 30 * Math.PI / 180) * 40}%`,
                animation: `confettiBurst 1s ease-out ${i * 50}ms forwards`,
                opacity: 0,
              }} />
          ))}
          <div className="text-5xl">🎉</div>
        </div>

        <h2 className="text-2xl font-display font-bold mb-2" style={{ color: "var(--color-text)" }}>
          {isTrial ? "Đã kích hoạt thử Pro!" : "Bạn đã nâng cấp Pro!"}
        </h2>

        {isTrial && (
          <p className="text-sm mb-4" style={{ color: "#F59E0B" }}>
            3 ngày miễn phí bắt đầu từ bây giờ
          </p>
        )}

        <div className="flex flex-col gap-2 mb-6 text-left mx-auto max-w-xs">
          {PERKS.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text)" }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>✓</span>
              {p}
            </div>
          ))}
        </div>

        <button onClick={onContinue}
          className="px-6 py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
          style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", color: "#fff", boxShadow: "0 4px 16px rgba(139,113,234,0.25)" }}>
          Bắt đầu luyện tập →
        </button>
      </div>

      <style>{`
        @keyframes confettiBurst {
          0% { opacity: 0; transform: scale(0) translateY(0); }
          50% { opacity: 1; transform: scale(1.5) translateY(-20px); }
          100% { opacity: 0; transform: scale(0.5) translateY(-40px); }
        }
      `}</style>
    </div>
  );
}
