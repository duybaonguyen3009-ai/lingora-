"use client";

/**
 * LevelUpOverlay.tsx — Dramatic level-up ceremony.
 *
 * Animation timeline:
 *   0ms:    backdrop appears (blur + darken)
 *   200ms:  purple energy ring expands
 *   500ms:  level number scales in (old → new)
 *   800ms:  "LEVEL N UNLOCKED" text fades in
 *   1800ms: dismiss button appears
 *   Auto-skippable after 1.5s, auto-dismiss after 5s
 *
 * Uses framer-motion for orchestrated animations.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/ui/Mascot";
import type { RewardEvent } from "@/contexts/RewardContext";

interface LevelUpOverlayProps {
  event: RewardEvent & { type: "level_up" };
  onDone: () => void;
}

export default function LevelUpOverlay({ event, onDone }: LevelUpOverlayProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [visible, setVisible] = useState(true);

  // Allow dismissal after 1.5s
  useEffect(() => {
    const t1 = setTimeout(() => setCanDismiss(true), 1500);
    const t2 = setTimeout(() => setVisible(false), 5000); // auto-dismiss
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Escape key dismissal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canDismiss) setVisible(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canDismiss]);

  const handleDismiss = useCallback(() => {
    if (canDismiss) setVisible(false);
  }, [canDismiss]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-overlay flex items-center justify-center"
          onClick={handleDismiss}
          role="dialog"
          aria-modal="true"
          aria-label={`Level up! You reached level ${event.newLevel}`}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Content */}
          <div
            className="relative flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Energy ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ delay: 0.2, duration: 1.2, ease: [0.33, 1, 0.68, 1] }}
              className="absolute w-64 h-64 rounded-full pointer-events-none"
              style={{
                border: "2px solid rgba(139,92,246,0.5)",
                boxShadow: "0 0 40px rgba(139,92,246,0.3), inset 0 0 40px rgba(139,92,246,0.15)",
              }}
            />

            {/* Second ring (delayed) */}
            <motion.div
              initial={{ scale: 0, opacity: 0.6 }}
              animate={{ scale: 1.3, opacity: 0 }}
              transition={{ delay: 0.4, duration: 1.4, ease: [0.33, 1, 0.68, 1] }}
              className="absolute w-64 h-64 rounded-full pointer-events-none"
              style={{
                border: "1px solid rgba(0,168,150,0.4)",
                boxShadow: "0 0 30px rgba(0,168,150,0.2)",
              }}
            />

            {/* Level number */}
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative z-10 mb-4"
            >
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,168,150,0.15))",
                  border: "2px solid rgba(139,92,246,0.3)",
                  boxShadow: "0 0 40px rgba(139,92,246,0.2), 0 0 80px rgba(0,168,150,0.1)",
                }}
              >
                <span
                  className="font-display font-bold text-5xl"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6, #00A896)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {event.newLevel}
                </span>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
              className="relative z-10 mb-6"
            >
              <p
                className="text-xs font-bold uppercase tracking-[3px] mb-2"
                style={{ color: "rgba(139,92,246,0.8)" }}
              >
                Lên level!
              </p>
              <h2 className="text-2xl font-display font-bold text-white">
                Level {event.newLevel} đã mở khóa!
              </h2>
              <div className="flex items-center justify-center mt-2 mb-1">
                <Mascot size={48} mood="happy" />
              </div>
              <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
                Lintopus tự hào lắm! {event.totalXp.toLocaleString()} XP 🐙🎉
              </p>
            </motion.div>

            {/* XP progress overflow bar */}
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.6, duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
              className="relative z-10 w-48 h-2 rounded-full overflow-hidden mb-8"
              style={{ backgroundColor: "rgba(255,255,255,0.08)", transformOrigin: "left" }}
            >
              <motion.div
                initial={{ width: "80%" }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #8B5CF6, #00A896)",
                  boxShadow: "0 0 12px rgba(139,92,246,0.4)",
                }}
              />
            </motion.div>

            {/* Dismiss button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: canDismiss ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              className="relative z-10"
            >
              <button
                onClick={handleDismiss}
                disabled={!canDismiss}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] cursor-pointer disabled:cursor-default"
                style={{
                  background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,168,150,0.15))",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "#fff",
                }}
              >
                Continue
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
