"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const STEPS = [
  {
    number: "01",
    title: "Tạo tài khoản miễn phí",
    description: "Chỉ cần email và 30 giây. Bắt đầu luyện tập ngay lập tức.",
    icon: UserPlusIcon,
  },
  {
    number: "02",
    title: "Chọn mục tiêu IELTS của bạn",
    description: "Lingona tạo lộ trình cá nhân hóa dựa trên band score mục tiêu của bạn.",
    icon: TargetIcon,
  },
  {
    number: "03",
    title: "Luyện tập mỗi ngày với AI coach",
    description: "Speaking, Grammar, Writing — AI coach phản hồi real-time, giúp bạn tiến bộ từng ngày.",
    icon: SparklesIcon,
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] rounded-full bg-[#00A896]/[0.03] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-white">
            Bắt đầu chỉ trong{" "}
            <span className="text-teal">
              3 bước
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-[72px] left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-transparent via-[#00A896]/20 to-transparent" aria-hidden="true" />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              {/* Step number circle */}
              <div className="relative inline-flex items-center justify-center w-[72px] h-[72px] rounded-full border border-[#00A896]/20 bg-[#00A896]/[0.06] mb-6">
                <step.icon className="w-7 h-7 text-[#00A896]" />
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#0A0F1E] border border-[#00A896]/30 flex items-center justify-center text-[11px] font-bold text-[#00A896]">
                  {step.number}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>

              {/* Lintopus on last step */}
              {i === 2 && (
                <motion.div
                  animate={{ y: [-4, 4, -4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="mt-6 inline-block"
                >
                  <Image src="/mascot.svg" alt="Lintopus mascot" width={120} height={120} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Icons ── */

function UserPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
