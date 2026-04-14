"use client";

/**
 * ProUpgradeModal.tsx — Premium upgrade modal with pricing, features,
 * trial option, and comparison table.
 */

import { useState, useEffect, useCallback } from "react";
import { startProTrial, upgradeToPro, getBandProgress } from "@/lib/api";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import Mascot from "@/components/ui/Mascot";

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgraded: () => void;
}

const FEATURES = [
  "Luyện Speaking AI không giới hạn",
  "Chấm Writing chi tiết như giám khảo thật",
  "Biết chính xác cần cải thiện gì",
  "Lộ trình học cá nhân hoá",
  "Hỗ trợ ưu tiên 24/7",
];

const COMPARISON = [
  { feature: "Speaking AI", free: "3 lần/ngày", pro: "Không giới hạn" },
  { feature: "Writing AI", free: "1 bài/ngày", pro: "Không giới hạn" },
  { feature: "Phân tích", free: "Cơ bản", pro: "Chi tiết" },
  { feature: "Lộ trình", free: "—", pro: "✔" },
  { feature: "Hỗ trợ", free: "—", pro: "Ưu tiên" },
];

// ─── Pricing tiers (safe pricing) ───────────────────────────────────────────
const MONTHLY_BASE = 179_000;

type PlanId = "m1" | "m3" | "m6" | "m12";

interface Plan {
  id: PlanId;
  label: string;
  short: string;
  months: number;
  price: number;
  perMonth: number;
  savings: number;
  tag?: string;
}

const PLANS: Plan[] = [
  { id: "m1",  label: "1 tháng", short: "1T",  months: 1,  price: 179_000,   perMonth: 179_000, savings: 0 },
  { id: "m3",  label: "3 tháng", short: "3T",  months: 3,  price: 499_000,   perMonth: 166_333, savings: 7 },
  { id: "m6",  label: "6 tháng", short: "6T",  months: 6,  price: 929_000,   perMonth: 154_833, savings: 14 },
  { id: "m12", label: "1 năm",   short: "12T", months: 12, price: 1_490_000, perMonth: 124_167, savings: 31, tag: "Tiết kiệm nhất" },
];

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
}

export default function ProUpgradeModal({ isOpen, onClose, onUpgraded }: ProUpgradeModalProps) {
  const [planId, setPlanId] = useState<PlanId>("m12");
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[3];
  const originalPrice = MONTHLY_BASE * plan.months;
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [estimatedBand, setEstimatedBand] = useState<number | null>(null);
  const userId = useCurrentUserId();

  useEffect(() => {
    if (!isOpen || !userId) return;
    getBandProgress(userId).then((d) => setEstimatedBand(d.estimated_band)).catch(() => {});
  }, [isOpen, userId]);

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      await upgradeToPro();
      onUpgraded();
    } catch { /* silent */ }
    setLoading(false);
  }, [onUpgraded]);

  const handleTrial = useCallback(async () => {
    setTrialLoading(true);
    try {
      await startProTrial();
      onUpgraded();
    } catch { /* silent */ }
    setTrialLoading(false);
  }, [onUpgraded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-overlay flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto rounded-2xl relative"
        style={{ background: "linear-gradient(135deg, #020617, #0F172A)", border: "1px solid rgba(255,255,255,0.1)" }}>

        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
          ✕
        </button>

        <div className="p-6 flex flex-col gap-5">
          {/* Personalized hook */}
          {estimatedBand && (
            <div className="text-center text-xs px-3 py-2 rounded-full mx-auto" style={{ background: "rgba(139,113,234,0.12)", color: "#A5B4FC" }}>
              Bạn đang Band {estimatedBand.toFixed(1)} → Pro giúp bạn lên {Math.ceil(estimatedBand + 0.5).toFixed(1)} nhanh hơn
            </div>
          )}

          {/* Mascot + Headline */}
          <div className="text-center">
            <div className="flex justify-center mb-3"><Mascot size={56} mood="happy" /></div>
            <h2 className="text-2xl font-display font-bold" style={{ color: "#F8FAFC" }}>
              Cùng mình đi Pro nhé!
            </h2>
            <p className="text-sm mt-1" style={{ color: "#94A3B8" }}>
              Luyện không giới hạn, rẻ hơn 1 buổi gia sư nhiều lắm!
            </p>
          </div>

          {/* Plan selector — 4 tiers */}
          <div className="grid grid-cols-4 gap-2">
            {PLANS.map((p) => {
              const isActive = planId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className="relative px-2 py-3 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    background: isActive ? "rgba(139,113,234,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${isActive ? "rgba(139,113,234,0.5)" : "rgba(255,255,255,0.06)"}`,
                    color: isActive ? "#A5B4FC" : "rgba(255,255,255,0.55)",
                  }}
                >
                  <div className="font-bold">{p.label}</div>
                  {p.savings > 0 && (
                    <div className="text-[10px] mt-0.5 font-semibold" style={{ color: isActive ? "#2DD4BF" : "rgba(45,212,191,0.7)" }}>
                      -{p.savings}%
                    </div>
                  )}
                  {p.tag && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap" style={{ background: "#8B71EA", color: "#fff" }}>
                      {p.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2">
              <div className="text-3xl font-display font-bold" style={{ color: "#F8FAFC" }}>
                {formatVnd(plan.price)}
              </div>
              <div className="text-sm" style={{ color: "#64748B" }}>/ {plan.label}</div>
            </div>
            {plan.savings > 0 ? (
              <div className="text-xs mt-1 flex items-center justify-center gap-2" style={{ color: "#64748B" }}>
                <span className="line-through">{formatVnd(originalPrice)}</span>
                <span style={{ color: "#2DD4BF" }}>• Tiết kiệm {plan.savings}%</span>
              </div>
            ) : (
              <div className="text-xs mt-1" style={{ color: "#64748B" }}>
                Chỉ {formatVnd(plan.perMonth)}/tháng
              </div>
            )}
            {plan.savings > 0 && (
              <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                Chỉ {formatVnd(plan.perMonth)}/tháng
              </div>
            )}
          </div>

          {/* Features */}
          <div className="flex flex-col gap-2.5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm"
                style={{ color: "#E2E8F0", animationDelay: `${i * 80}ms` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(45,212,191,0.12)", color: "#2DD4BF" }}>
                  ✓
                </span>
                {f}
              </div>
            ))}
          </div>

          {/* CTA */}
          <button onClick={handleUpgrade} disabled={loading}
            className="w-full py-3.5 rounded-xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #8B71EA, #2DD4BF)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(139,113,234,0.3)",
            }}>
            {loading ? "Đang xử lý..." : "Bắt đầu Pro ngay"}
          </button>

          {/* Trial */}
          <button onClick={handleTrial} disabled={trialLoading}
            className="text-sm font-medium text-center transition-all disabled:opacity-50"
            style={{ color: "#64748B" }}>
            {trialLoading ? "Đang kích hoạt..." : "Hoặc thử miễn phí 3 ngày →"}
          </button>

          {/* Trust */}
          <p className="text-xs text-center" style={{ color: "#475569" }}>
            Hủy bất kỳ lúc nào • Không ràng buộc
          </p>

          {/* Comparison table */}
          <div className="rounded-xl overflow-hidden mt-2" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: "#94A3B8" }}>Tính năng</th>
                  <th className="text-center px-3 py-2 font-semibold" style={{ color: "#94A3B8" }}>Free</th>
                  <th className="text-center px-3 py-2 font-semibold" style={{ color: "#A5B4FC", textShadow: "0 0 8px rgba(139,113,234,0.3)" }}>Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="px-3 py-2" style={{ color: "#CBD5E1" }}>{row.feature}</td>
                    <td className="text-center px-3 py-2" style={{ color: "#64748B" }}>{row.free}</td>
                    <td className="text-center px-3 py-2 font-medium" style={{ color: "#2DD4BF" }}>{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
