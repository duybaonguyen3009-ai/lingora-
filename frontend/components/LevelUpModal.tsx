"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";
import useSound from "@/hooks/useSound";

interface LevelUpModalProps {
  level:    number;
  onClose:  () => void;
}

function ParticleBurst() {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360;
    const rad = (angle * Math.PI) / 180;
    const tx = Math.cos(rad) * 80;
    const ty = Math.sin(rad) * 80;
    return { id: i, tx, ty, delay: i * 0.05 };
  });

  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full"
          style={{
            top: '50%', left: '50%',
            background: 'var(--color-success)',
            opacity: 0,
            animation: `particleBurst 1s ease-out ${p.delay}s forwards`,
            ['--tx' as string]: `${p.tx}px`,
            ['--ty' as string]: `${p.ty}px`,
          }}
        />
      ))}
    </>
  );
}

/**
 * LevelUpModal
 *
 * Celebration overlay shown when the user levels up after completing a lesson.
 * Auto-closes after 5 s; user can also dismiss manually.
 */
export default function LevelUpModal({ level, onClose }: LevelUpModalProps) {
  const { play } = useSound();

  // Auto-close after 5 s.
  useEffect(() => {
    play("levelup", 0.6);
    const id = setTimeout(onClose, 5000);
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
        className="relative flex flex-col items-center gap-5 px-10 py-10 rounded-lg border text-center max-w-xs w-full mx-4"
        style={{
          borderColor: "rgba(46,211,198,0.3)",
          background: "linear-gradient(145deg, var(--color-bg-card) 0%, var(--color-bg-secondary) 100%)",
          boxShadow: "0 0 60px rgba(46,211,198,0.2), 0 0 0 1px rgba(46,211,198,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated mascot with particle burst */}
        <div className="relative">
          <ParticleBurst />
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
            style={{
              background: "radial-gradient(circle, rgba(46,211,198,0.25) 0%, rgba(45,168,255,0.1) 70%, transparent 100%)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            <Mascot size={64} />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-success)" }}>
            Level Up!
          </p>
          <p className="text-4xl font-bold font-sora leading-none" style={{ color: "var(--color-text)" }}>
            Level {level}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            You&apos;re on a roll — keep learning!
          </p>
        </div>

        <Button
          variant="success"
          size="md"
          onClick={onClose}
          className="mt-1"
          style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", color: "var(--color-bg)" }}
        >
          Continue
        </Button>

        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>Closes automatically in 5 s</p>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1);   opacity: 1;   }
          50%       { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes particleBurst {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.3); }
        }
      `}</style>
    </div>
  );
}
