"use client";

/**
 * RankPromotionOverlay.tsx — 3-phase rank-up cinematic.
 *
 * Phase 1 — Tension (0–800ms): backdrop darkens, old rank + progress bar fills
 * Phase 2 — Breakthrough (800–1800ms): energy flash, old dissolves, new scales in
 * Phase 3 — Status (1800–3000ms): "PROMOTED TO [RANK]", percentile, buttons
 *
 * Skippable after 1.5s, auto-dismiss after 6s.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Mascot from "@/components/ui/Mascot";
import type { RewardEvent } from "@/contexts/RewardContext";
import type { BattleRankTier } from "@/lib/types";

interface RankPromotionOverlayProps {
  event: RewardEvent & { type: "rank_up" };
  onDone: () => void;
}

const RANK_STYLES: Record<BattleRankTier, { label: string; color: string; glow: string }> = {
  iron:       { label: "Iron",       color: "#8B8B8B", glow: "rgba(139,139,139,0.3)" },
  bronze:     { label: "Bronze",     color: "#CD7F32", glow: "rgba(205,127,50,0.3)" },
  silver:     { label: "Silver",     color: "#C0C0C0", glow: "rgba(192,192,192,0.3)" },
  gold:       { label: "Gold",       color: "#FFD700", glow: "rgba(255,215,0,0.3)" },
  platinum:   { label: "Platinum",   color: "#00FFFF", glow: "rgba(0,255,255,0.3)" },
  diamond:    { label: "Diamond",    color: "#9B59B6", glow: "rgba(155,89,182,0.3)" },
  challenger: { label: "Challenger", color: "#FF6B35", glow: "rgba(255,107,53,0.3)" },
};

export default function RankPromotionOverlay({ event, onDone }: RankPromotionOverlayProps) {
  const [canDismiss, setCanDismiss] = useState(false);
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<1 | 2 | 3>(1);

  const oldStyle = RANK_STYLES[event.oldRank] ?? RANK_STYLES.iron;
  const newStyle = RANK_STYLES[event.newRank] ?? RANK_STYLES.iron;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(2), 800);
    const t2 = setTimeout(() => setPhase(3), 1800);
    const t3 = setTimeout(() => setCanDismiss(true), 1500);
    const t4 = setTimeout(() => setVisible(false), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

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
          aria-label={`Promoted to ${newStyle.label}`}
        >
          {/* Backdrop with rank color flood */}
          <motion.div
            className="absolute inset-0"
            initial={{ background: "rgba(0,0,0,0.6)" }}
            animate={{
              background: phase >= 2
                ? `radial-gradient(ellipse at center, ${newStyle.glow} 0%, rgba(0,0,0,0.8) 70%)`
                : "rgba(0,0,0,0.7)",
            }}
            transition={{ duration: 0.6 }}
            style={{ backdropFilter: "blur(8px)" }}
          />

          <div
            className="relative flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Phase 1: Old rank + progress bar ── */}
            <AnimatePresence>
              {phase === 1 && (
                <motion.div
                  key="old-rank"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.5, filter: "blur(8px)" }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-4xl mb-4"
                    style={{
                      border: `3px solid ${oldStyle.color}`,
                      background: `${oldStyle.color}15`,
                      boxShadow: `0 0 30px ${oldStyle.glow}`,
                    }}
                  >
                    <span className="font-display font-bold text-3xl" style={{ color: oldStyle.color }}>
                      {oldStyle.label[0]}
                    </span>
                  </div>

                  {/* Progress bar filling to max */}
                  <div className="w-40 h-2 rounded-full overflow-hidden mb-3" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <motion.div
                      initial={{ width: "60%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                      className="h-full rounded-full"
                      style={{ background: oldStyle.color }}
                    />
                  </div>

                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                    Đang lên hạng...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Phase 2: Energy flash + new rank ── */}
            {phase >= 2 && (
              <>
                {/* Energy flash ring */}
                <motion.div
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1, ease: [0.33, 1, 0.68, 1] }}
                  className="absolute w-32 h-32 rounded-full pointer-events-none"
                  style={{
                    border: `2px solid ${newStyle.color}`,
                    boxShadow: `0 0 40px ${newStyle.glow}`,
                  }}
                />

                {/* New rank emblem */}
                <motion.div
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                  className="flex flex-col items-center"
                >
                  <div
                    className="w-28 h-28 rounded-full flex items-center justify-center mb-5"
                    style={{
                      border: `3px solid ${newStyle.color}`,
                      background: `linear-gradient(135deg, ${newStyle.color}20, ${newStyle.color}08)`,
                      boxShadow: `0 0 50px ${newStyle.glow}, 0 0 100px ${newStyle.glow}`,
                    }}
                  >
                    <span
                      className="font-display font-bold text-4xl"
                      style={{ color: newStyle.color }}
                    >
                      {newStyle.label[0]}
                    </span>
                  </div>

                  {/* ── Phase 3: Text + buttons ── */}
                  {phase >= 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
                      className="flex flex-col items-center"
                    >
                      <p
                        className="text-[10px] font-bold uppercase tracking-[3px] mb-1.5"
                        style={{ color: `${newStyle.color}CC` }}
                      >
                        Lên hạng!
                      </p>
                      <h2
                        className="text-2xl font-display font-bold mb-1"
                        style={{ color: newStyle.color }}
                      >
                        {newStyle.label}
                      </h2>
                      <div className="my-2"><Mascot size={40} mood="happy" /></div>
                      {event.percentile != null && (
                        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                          Top {event.percentile}% — Lintopus tự hào lắm! 🐙🎉
                        </p>
                      )}

                      {/* Action buttons */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: canDismiss ? 1 : 0 }}
                        className="flex items-center gap-3"
                      >
                        <button
                          onClick={handleDismiss}
                          disabled={!canDismiss}
                          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.97] cursor-pointer disabled:cursor-default"
                          style={{
                            background: `linear-gradient(135deg, ${newStyle.color}30, ${newStyle.color}15)`,
                            border: `1px solid ${newStyle.color}40`,
                            color: "#fff",
                          }}
                        >
                          Continue
                        </button>
                        <button
                          onClick={handleDismiss}
                          disabled={!canDismiss}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium transition-all active:scale-[0.97] cursor-pointer disabled:cursor-default"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          Leaderboard
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
