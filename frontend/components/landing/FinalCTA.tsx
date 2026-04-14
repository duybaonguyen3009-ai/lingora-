"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function FinalCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#00A896]/[0.06] blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Lintopus */}
          <motion.div
            animate={{ y: [-6, 6, -6] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="inline-block mb-8"
          >
            <Image src="/mascot.svg" alt="Lintopus mascot" width={220} height={220} />
          </motion.div>

          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-white max-w-2xl mx-auto leading-tight">
            Bắt đầu hành trình IELTS của bạn{" "}
            <span className="text-teal">
              hôm nay
            </span>
          </h2>

          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-4 rounded-md bg-gradient-to-r from-[#00A896] to-[#00C9B1] text-white font-medium text-base hover:opacity-90 transition-opacity duration-200 shadow-[0_0_32px_rgba(0,168,150,0.3)] cursor-pointer"
            >
              Tạo tài khoản miễn phí
              <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Không cần thẻ tín dụng. Miễn phí mãi mãi.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
