"use client";

import { useEffect } from "react";

interface LevelUpModalProps {
  level:    number;
  onClose:  () => void;
}

/**
 * LevelUpModal
 *
 * Celebration overlay shown when the user levels up after completing a lesson.
 * Auto-closes after 3 s; user can also dismiss manually.
 */
export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  // Auto-close after 3 s.
  useEffect(() => {
    const id = setTimeout(onClose, 3000);
    return () => clearTimeout(id);
  }, [onClose]);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label={`Level up! You reached level ${level}`}
    >
      <div
        className="relative flex flex-col items-center gap-5 px-10 py-10 rounded-[24px] border text-center max-w-xs w-full mx-4"
        style={{
          borderColor: "rgba(46,211,198,0.3)",
          background: "linear-gradient(145deg, #0B1E33 0%, #0D2137 100%)",
          boxShadow: "0 0 60px rgba(46,211,198,0.2), 0 0 0 1px rgba(46,211,198,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated star burst */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: "radial-gradient(circle, rgba(46,211,198,0.25) 0%, rgba(45,168,255,0.1) 70%, transparent 100%)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            {"\u26A1"}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: "var(--color-success)" }}>
            Level Up!
          </p>
          <p className="text-4xl font-bold font-sora leading-none" style={{ color: "var(--color-text)" }}>
            Level {level}
          </p>
          <p className="text-[13px] mt-1" style={{ color: "var(--color-text-secondary)" }}>
            You&apos;re on a roll — keep learning!
          </p>
        </div>

        <button
          onClick={onClose}
          className="mt-1 px-6 py-2.5 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", color: "var(--color-bg)" }}
        >
          Continue
        </button>

        <p className="text-[10px]" style={{ color: "#4A6B80" }}>Closes automatically in 3 s</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
