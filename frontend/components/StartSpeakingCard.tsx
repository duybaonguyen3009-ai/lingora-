"use client";

import { IconMic } from "./Icons";

interface StartSpeakingCardProps {
  onStart: () => void;
}

export default function StartSpeakingCard({ onStart }: StartSpeakingCardProps) {
  return (
    <div
      className="relative rounded-2xl p-6 flex flex-col items-center text-center gap-4 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--color-primary), #6C4FD6)",
        minHeight: "260px",
      }}
    >
      {/* Subtle glow circle */}
      <div
        className="absolute top-[-40px] right-[-40px] w-[180px] h-[180px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent)" }}
      />

      {/* Mascot */}
      <div className="relative z-10 mt-2">
        <img
          src="/lingora-logo.png"
          alt="Lingona mascot"
          className="w-20 h-20 object-contain drop-shadow-lg"
        />
      </div>

      {/* Text */}
      <div className="relative z-10">
        <h2 className="font-sora font-bold text-[22px] text-white leading-tight">
          Ready to speak?
        </h2>
        <p className="text-white/70 text-sm mt-1">
          Practice English with your AI coach
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={onStart}
        className="relative z-10 flex items-center gap-2.5 px-8 py-3.5 rounded-full font-sora font-semibold text-[15px] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
        style={{
          backgroundColor: "white",
          color: "var(--color-primary)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <IconMic size={18} />
        Start Speaking
      </button>
    </div>
  );
}
