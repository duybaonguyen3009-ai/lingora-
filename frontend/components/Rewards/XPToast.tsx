"use client";

/**
 * XPToast.tsx — Floating "+N XP" chip animation.
 *
 * Appears near top-right. Animation:
 *   In:  scale 0.92→1, opacity 0→1, translateY 8→0 (600ms)
 *   Hold: 1s
 *   Out: opacity 1→0, translateY 0→-8 (400ms)
 *
 * Uses framer-motion AnimatePresence.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RewardEvent } from "@/contexts/RewardContext";

interface XPToastProps {
  event: RewardEvent & { type: "xp_gain" };
  onDone: () => void;
}

export default function XPToast({ event, onDone }: XPToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hold for 1s, then exit
    const timer = setTimeout(() => setVisible(false), 1600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          className="fixed top-6 right-6 lg:top-6 lg:right-[calc(50%-560px)] z-overlay flex flex-col items-end gap-1 pointer-events-none"
        >
          {/* Main XP chip */}
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: "linear-gradient(135deg, rgba(0,168,150,0.9), rgba(0,196,176,0.85))",
              boxShadow: "0 4px 20px rgba(0,168,150,0.35), 0 0 0 1px rgba(255,255,255,0.1) inset",
              backdropFilter: "blur(8px)",
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-white font-bold text-sm">
              +{event.amount} XP
            </span>
          </div>

          {/* Bonus chip (if present) */}
          {event.bonus && event.bonus > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(245,158,11,0.85)",
                boxShadow: "0 2px 12px rgba(245,158,11,0.3)",
              }}
            >
              <span className="text-white font-bold text-xs">
                +{event.bonus} Bonus
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
