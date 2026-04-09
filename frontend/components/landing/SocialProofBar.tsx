"use client";

import { motion } from "framer-motion";

const VALUE_PROPS = [
  "AI ch\u1ea5m \u0111i\u1ec3m theo ti\u00eau ch\u00ed IELTS th\u1eadt",
  "Ph\u1ea3n h\u1ed3i trong v\u00f2ng 2 gi\u00e2y",
  "Luy\u1ec7n Speaking 24/7 kh\u00f4ng c\u1ea7n \u0111\u1eb7t l\u1ecbch",
];

export default function SocialProofBar() {
  return (
    <section className="relative py-10 border-y border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          {VALUE_PROPS.map((prop, i) => (
            <motion.p
              key={prop}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="text-sm text-gray-400 flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-[#00A896] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {prop}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
