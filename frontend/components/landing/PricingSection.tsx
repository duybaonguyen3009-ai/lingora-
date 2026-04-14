"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const FREE_FEATURES = [
  "Speaking AI (3 lần/ngày)",
  "Writing AI (1 lần/ngày)",
  "Grammar Journey đầy đủ",
  "Reading & Listening không giới hạn",
  "Streak, XP, Leaderboard đầy đủ",
  "IELTS Battle & Rank đầy đủ",
  "Streak Shield (1 lần/tuần)",
];

const PRO_FEATURES = [
  "Tất cả tính năng Free",
  "Speaking AI không giới hạn",
  "Writing AI không giới hạn",
  "IELTS Full Mock Test không giới hạn",
  "Band score prediction + phân tích điểm yếu",
  "Lộ trình học cá nhân AI adaptive",
  "Study Rooms + AI Group Coach",
  "Streak Shield (3 lần/tuần)",
  "Priority support + early access",
];

// ─── Pricing tiers (safe pricing) ───────────────────────────────────────────
const MONTHLY_BASE = 179_000; // base monthly rate

type PlanId = "m1" | "m3" | "m6" | "m12";

interface Plan {
  id: PlanId;
  label: string;
  months: number;
  price: number;
  perMonth: number;
  savings: number;  // % off monthly base
  tag?: string;
}

const PLANS: Plan[] = [
  { id: "m1",  label: "1 tháng", months: 1,  price: 179_000,   perMonth: 179_000, savings: 0 },
  { id: "m3",  label: "3 tháng", months: 3,  price: 499_000,   perMonth: 166_333, savings: 7 },
  { id: "m6",  label: "6 tháng", months: 6,  price: 929_000,   perMonth: 154_833, savings: 14, tag: "Phổ biến" },
  { id: "m12", label: "1 năm",   months: 12, price: 1_490_000, perMonth: 124_167, savings: 31, tag: "Tiết kiệm nhất" },
];

function formatVnd(n: number): string {
  return n.toLocaleString("vi-VN").replace(/,/g, ".") + "đ";
}

export default function PricingSection() {
  const [planId, setPlanId] = useState<PlanId>("m12"); // default: 1 năm
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[3];
  const originalPrice = MONTHLY_BASE * plan.months;

  return (
    <section id="pricing" className="relative py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-white">
            Đơn giản, minh bạch
          </h2>
          <p className="mt-4 text-gray-400 text-base">
            Bắt đầu miễn phí. Nâng cấp khi bạn sẵn sàng.
          </p>

          {/* Plan selector — 4 tiers */}
          <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 bg-white/[0.04] rounded-full p-1 border border-white/[0.06]">
            {PLANS.map((p) => {
              const isActive = planId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? "bg-white/[0.1] text-white"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  {p.label}
                  {p.savings > 0 && (
                    <span className="ml-1.5 text-[10px] font-bold text-teal">-{p.savings}%</span>
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* FREE */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="relative rounded-xl p-8 bg-[#0F1429]/60 border border-[#1B2B4B]"
          >
            <h3 className="text-lg font-semibold text-white">Free</h3>
            <div className="mt-4 mb-1">
              <span className="text-3xl font-bold text-white font-playfair">
                Miễn phí
              </span>
            </div>
            <p className="text-sm text-gray-400 mb-6">Mãi mãi</p>

            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                  <svg className="w-4 h-4 mt-0.5 text-teal flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block w-full text-center py-3 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer border border-white/[0.1] text-gray-300 hover:bg-white/[0.04] hover:border-white/[0.15]"
            >
              Bắt đầu miễn phí
            </Link>
          </motion.div>

          {/* PRO */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="relative rounded-xl p-8 bg-gradient-to-b from-[#00A896]/[0.08] to-[#0F1429]/60 border-2 border-teal/30 shadow-[0_0_40px_rgba(0,168,150,0.08)]"
          >
            {plan.tag && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#00A896] to-[#00C9B1] text-white whitespace-nowrap">
                {plan.tag}
              </span>
            )}

            <h3 className="text-lg font-semibold text-white">Pro — {plan.label}</h3>
            <div className="mt-4 mb-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white font-playfair">
                {formatVnd(plan.price)}
              </span>
              <span className="text-sm text-gray-400">
                /{plan.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2 min-h-[24px]">
              {plan.savings > 0 ? (
                <>
                  <span className="text-xs text-teal font-semibold px-2 py-0.5 rounded-full bg-teal/10 border border-teal/20">
                    Tiết kiệm {plan.savings}%
                  </span>
                  <span className="text-xs text-gray-500 line-through">{formatVnd(originalPrice)}</span>
                </>
              ) : null}
            </div>
            <p className="text-xs text-gray-400 mb-6">
              Chỉ {formatVnd(plan.perMonth)}/tháng
            </p>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                  <svg className="w-4 h-4 mt-0.5 text-teal flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <Link
              href="/register"
              className="block w-full text-center py-3 rounded-md font-medium text-sm transition-all duration-200 cursor-pointer bg-gradient-to-r from-[#00A896] to-[#00C9B1] text-white hover:opacity-90 shadow-[0_0_20px_rgba(0,168,150,0.2)]"
            >
              Sắp ra mắt — Thông báo tôi
            </Link>
          </motion.div>
        </div>

        {/* Notes */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-gray-400">
            Sinh viên giảm 20% — nhập mã <span className="text-teal font-medium">.edu</span> khi thanh toán
          </p>
          <p className="text-sm text-gray-500">
            Dùng thử 3 ngày miễn phí &bull; Không cần thẻ tín dụng
          </p>
        </div>
      </div>
    </section>
  );
}
