"use client";

/**
 * OnboardingFlow.tsx — 6-screen cinematic onboarding diagnostic.
 *
 * Screen 1: Target band selection
 * Screen 2: Set expectation
 * Screen 3: Speaking diagnostic (30s recording)
 * Screen 4: Analyzing animation
 * Screen 5: Band result
 * Screen 6: Transition to app
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { completeOnboarding, skipOnboarding } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import Mascot from "@/components/ui/Mascot";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const BAND_OPTIONS = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5];
const PROMPTS = [
  "Describe your hometown. What do you like most about it?",
  "What do you usually do in your free time?",
  "Do you prefer studying alone or with others? Why?",
];
const ANALYZING_TEXTS = [
  "Đang phân tích độ trôi chảy…",
  "Đang đánh giá từ vựng…",
  "Đang kiểm tra ngữ pháp…",
  "Đang ước tính band…",
];

type Screen = 1 | 2 | 3 | 4 | 5 | 6;

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [screen, setScreen] = useState<Screen>(1);
  const [targetBand, setTargetBand] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingDone, setRecordingDone] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [analyzingIdx, setAnalyzingIdx] = useState(0);
  const [estimatedBand, setEstimatedBand] = useState(5.5);
  const [fade, setFade] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  // Smooth screen transition
  const goTo = useCallback((s: Screen) => {
    setFade(false);
    setTimeout(() => { setScreen(s); setFade(true); }, 300);
  }, []);

  const handleSkip = useCallback(async () => {
    try { await skipOnboarding(); } catch { /* silent */ }
    onComplete();
  }, [onComplete]);

  // Screen 3: recording timer
  useEffect(() => {
    if (!recording) return;
    timerRef.current = setInterval(() => {
      setRecordTime((t) => {
        if (t >= 29) {
          // Auto-stop at 30s
          setRecording(false);
          setRecordingDone(true);
          if (timerRef.current) clearInterval(timerRef.current);
          return 30;
        }
        return t + 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  // Auto-advance from recording done → analyzing
  useEffect(() => {
    if (recordingDone) {
      const t = setTimeout(() => goTo(4), 800);
      return () => clearTimeout(t);
    }
  }, [recordingDone, goTo]);

  // Screen 4: cycling text + simulated analysis
  useEffect(() => {
    if (screen !== 4) return;
    const textTimer = setInterval(() => setAnalyzingIdx((i) => (i + 1) % ANALYZING_TEXTS.length), 800);
    // Simulate scoring (2.5s min)
    const doneTimer = setTimeout(() => {
      // Generate a realistic band based on recording duration
      const band = recordTime >= 20 ? 5.5 + Math.random() * 1.5 : 4.5 + Math.random() * 1.0;
      setEstimatedBand(Math.round(band * 2) / 2);
      goTo(5);
    }, 2500);
    return () => { clearInterval(textTimer); clearTimeout(doneTimer); };
  }, [screen, recordTime, goTo]);

  // Screen 5: complete onboarding
  const handleComplete = useCallback(async () => {
    try { await completeOnboarding(targetBand); } catch { /* silent */ }
    analytics.onboardingComplete(targetBand, estimatedBand);
    goTo(6);
  }, [targetBand, estimatedBand, goTo]);

  // Screen 6: auto-transition
  useEffect(() => {
    if (screen !== 6) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [screen, onComplete]);

  // ---------------------------------------------------------------------------
  // Skip link component
  // ---------------------------------------------------------------------------
  const SkipLink = () => (
    <button onClick={handleSkip} className="text-xs font-medium mt-4 transition-colors" style={{ color: "#475569" }}>
      Bỏ qua →
    </button>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-splash flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F172A, #020617)" }}>
      <div className={`w-full max-w-md px-6 flex flex-col items-center text-center transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}>

        {/* SCREEN 1 — Target Band */}
        {screen === 1 && (
          <>
            <div className="mb-6">
              <Mascot size={48} />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2" style={{ color: "#F8FAFC" }}>
              Bạn muốn đạt band IELTS mấy?
            </h1>
            <p className="text-xs mb-6" style={{ color: "#64748B" }}>
              Hầu hết học viên đặt mục tiêu 6.5+
            </p>
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-6">
              {BAND_OPTIONS.map((b) => (
                <button key={b} onClick={() => setTargetBand(b)}
                  className="py-3 rounded-xl text-base font-bold transition-all"
                  style={{
                    background: targetBand === b ? "linear-gradient(135deg, #8B71EA, #2DD4BF)" : "transparent",
                    color: targetBand === b ? "#fff" : "#94A3B8",
                    border: `2px solid ${targetBand === b ? "transparent" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: targetBand === b ? "0 0 20px rgba(139,113,234,0.3)" : "none",
                    transform: targetBand === b ? "scale(1.05)" : "scale(1)",
                  }}>
                  {b === 7.5 ? "7.5+" : b.toFixed(1)}
                </button>
              ))}
            </div>
            <button onClick={() => goTo(2)} disabled={!targetBand}
              className="w-full max-w-xs py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-30"
              style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", color: "#fff" }}>
              Tiếp tục
            </button>
            <SkipLink />
          </>
        )}

        {/* SCREEN 2 — Set Expectation */}
        {screen === 2 && (
          <>
            <h1 className="text-xl font-display font-bold mb-2" style={{ color: "#F8FAFC" }}>
              Chúng tôi sẽ ước tính band hiện tại của bạn
            </h1>
            <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
              Chỉ cần nói tự nhiên trong 30 giây — không có áp lực.
            </p>
            <button onClick={() => goTo(3)}
              className="w-full max-w-xs py-4 rounded-xl text-base font-bold transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", color: "#fff", boxShadow: "0 0 30px rgba(139,113,234,0.25)" }}>
              Bắt đầu bài test nói 🎤
            </button>
            <SkipLink />
          </>
        )}

        {/* SCREEN 3 — Speaking Diagnostic */}
        {screen === 3 && (
          <>
            <div className="rounded-xl p-4 mb-6 w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-sm italic" style={{ color: "#E2E8F0" }}>&ldquo;{prompt}&rdquo;</p>
            </div>

            {!recording && !recordingDone && (
              <>
                <button onClick={() => { setRecording(true); setRecordTime(0); }}
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all active:scale-90 mb-3"
                  style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", boxShadow: "0 0 40px rgba(139,113,234,0.3)" }}>
                  🎤
                </button>
                <p className="text-xs" style={{ color: "#94A3B8" }}>Nhấn để bắt đầu</p>
              </>
            )}

            {recording && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-3 relative"
                  style={{ background: "linear-gradient(135deg, #EF4444, #DC2626)" }}>
                  🎤
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.2)" }} />
                </div>
                {/* Sound wave bars */}
                <div className="flex items-center gap-1 h-8 mb-3">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="w-1 rounded-full" style={{
                      background: "#8B71EA",
                      height: `${12 + Math.random() * 20}px`,
                      animation: `waveBar 0.5s ease-in-out ${i * 40}ms infinite alternate`,
                    }} />
                  ))}
                </div>
                <div className="text-lg font-mono font-bold mb-2" style={{ color: recordTime >= 25 ? "#F59E0B" : recordTime >= 27 ? "#EF4444" : "#E2E8F0" }}>
                  0:{String(recordTime).padStart(2, "0")}
                </div>
                <button onClick={() => { setRecording(false); setRecordingDone(true); if (timerRef.current) clearInterval(timerRef.current); }}
                  className="px-4 py-2 rounded-lg text-xs font-medium" style={{ background: "rgba(255,255,255,0.06)", color: "#94A3B8" }}>
                  Dừng lại
                </button>
              </>
            )}

            {recordingDone && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-3" style={{ background: "rgba(34,197,94,0.15)" }}>
                  ✅
                </div>
                <p className="text-sm" style={{ color: "#94A3B8" }}>Xong! Đang phân tích...</p>
              </>
            )}

            <SkipLink />
          </>
        )}

        {/* SCREEN 4 — Analyzing */}
        {screen === 4 && (
          <>
            <div className="w-16 h-16 border-3 rounded-full animate-spin mb-6"
              style={{ borderColor: "#8B71EA", borderTopColor: "transparent", borderWidth: "3px" }} />
            <p className="text-base font-semibold mb-2" style={{ color: "#F8FAFC" }}>
              Đang phân tích giọng nói của bạn...
            </p>
            <p className="text-sm transition-all" style={{ color: "#8B71EA" }}>
              {ANALYZING_TEXTS[analyzingIdx]}
            </p>
          </>
        )}

        {/* SCREEN 5 — Result */}
        {screen === 5 && (
          <>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#94A3B8" }}>Band hiện tại của bạn</p>
            <div className="text-5xl font-display font-bold mb-3"
              style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", textShadow: "0 0 30px rgba(139,113,234,0.3)" }}>
              {estimatedBand.toFixed(1)}
            </div>
            {targetBand && (
              <div className="text-sm mb-1" style={{ color: "#A5B4FC" }}>
                Mục tiêu của bạn: {targetBand.toFixed(1)} 🎯
              </div>
            )}
            {targetBand && (
              <div className="text-xs mb-4" style={{ color: "#64748B" }}>
                Bạn cần cải thiện +{(targetBand - estimatedBand).toFixed(1)} band
              </div>
            )}
            <div className="flex flex-col gap-1 mb-6 text-sm">
              <span style={{ color: "#2DD4BF" }}>Điểm mạnh: Độ trôi chảy 👍</span>
              <span style={{ color: "#F59E0B" }}>Cần cải thiện: Từ vựng</span>
            </div>
            <button onClick={handleComplete}
              className="w-full max-w-xs py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", color: "#fff", boxShadow: "0 0 20px rgba(139,113,234,0.3)" }}>
              Bắt đầu cải thiện →
            </button>
          </>
        )}

        {/* SCREEN 6 — Transition */}
        {screen === 6 && (
          <>
            <h1 className="text-xl font-display font-bold mb-2" style={{ color: "#F8FAFC" }}>
              Hãy cùng lên Band {targetBand?.toFixed(1) || "6.5"}.
            </h1>
            <p className="text-sm mb-6" style={{ color: "#94A3B8" }}>
              Lộ trình của bạn đã sẵn sàng.
            </p>
            <button onClick={onComplete}
              className="px-6 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #8B71EA, #2DD4BF)", color: "#fff" }}>
              Vào Lingona →
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes waveBar {
          from { height: 8px; }
          to { height: 28px; }
        }
      `}</style>
    </div>
  );
}
