"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const } },
};

export default function HeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-28 pb-20">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-[#00A896]/[0.07] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full bg-[#1B2B4B]/[0.15] blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="text-center lg:text-left"
          >
            <motion.h1
              variants={fadeUp}
              className="font-playfair text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight"
            >
              Luyện IELTS{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00A896] to-[#00C9B1]">
                thông minh hơn
              </span>
              <br />
              cùng AI coach của bạn
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-base sm:text-lg text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              Lingona giúp bạn cải thiện Speaking, Grammar và Writing với phản hồi
              AI real-time. Không cần gia sư. Học mọi lúc, mọi nơi.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-md bg-gradient-to-r from-[#00A896] to-[#00C9B1] text-white font-medium text-base hover:opacity-90 transition-opacity duration-200 shadow-[0_0_24px_rgba(0,168,150,0.25)] cursor-pointer"
              >
                Bắt đầu miễn phí
                <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-md border border-white/[0.1] text-gray-300 font-medium text-base hover:bg-white/[0.04] hover:border-white/[0.15] transition-all duration-200 cursor-pointer"
              >
                Xem demo
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-6 flex items-center gap-2 justify-center lg:justify-start text-sm text-gray-500"
            >
              <span>Mi&#7877;n ph&iacute; ho&agrave;n to&agrave;n</span>
              <span>&bull;</span>
              <span>Kh&ocirc;ng c&#7847;n th&#7867; t&iacute;n d&#7909;ng</span>
            </motion.div>
          </motion.div>

          {/* Right — Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0, 0, 0.2, 1] }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Floating Lintopus */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-5 -right-5 z-30"
              >
                <Image src="/mascot.svg" alt="Lintopus mascot" width={160} height={160} priority />
              </motion.div>

              {/* Mock app screenshot */}
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#0F1429]">
                <div className="p-1">
                  {/* Browser chrome */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0A0F1E] rounded-t-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                    <div className="ml-3 flex-1 bg-white/[0.06] rounded-md py-1 px-3 text-xs text-gray-500">
                      lingona.app
                    </div>
                  </div>
                  {/* App mockup content */}
                  <div className="bg-gradient-to-b from-[#0F1429] to-[#141830] p-6 space-y-4 min-h-[320px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A896] to-[#1B2B4B] flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">AI Speaking Coach</div>
                        <div className="text-xs text-gray-500">IELTS Part 2 - Cue Card</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-[#1B2B4B]/40 rounded-lg p-3 border border-white/[0.04]">
                        <p className="text-xs text-gray-400">Examiner</p>
                        <p className="text-sm text-gray-200 mt-1">Describe a place you have visited that you found particularly beautiful.</p>
                      </div>
                      <div className="bg-[#00A896]/10 rounded-lg p-3 border border-[#00A896]/20 ml-8">
                        <p className="text-xs text-[#00A896]">You</p>
                        <p className="text-sm text-gray-200 mt-1">I would like to talk about Da Lat...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex-1 bg-white/[0.04] rounded-full py-2 px-4 text-xs text-gray-500">
                        Nhấn mic để nói...
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#00A896] to-[#00C9B1] flex items-center justify-center shadow-[0_0_16px_rgba(0,168,150,0.3)]">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

