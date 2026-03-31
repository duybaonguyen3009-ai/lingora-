"use client";

import { IconMic } from "./Icons";
import Button from "@/components/ui/Button";
import Mascot from "@/components/ui/Mascot";

interface StartSpeakingCardProps {
  onStart: () => void;
}

export default function StartSpeakingCard({ onStart }: StartSpeakingCardProps) {
  return (
    <div
      className="relative rounded-lg p-7 flex flex-col items-center text-center gap-5 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 80%, #000) 50%, color-mix(in srgb, var(--color-primary) 55%, #000) 100%)",
        minHeight: "270px",
      }}
    >
      {/* Subtle glow circle */}
      <div
        className="absolute top-[-40px] right-[-40px] w-[200px] h-[200px] rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, var(--color-accent), transparent)" }}
      />
      <div
        className="absolute bottom-[-30px] left-[-30px] w-[120px] h-[120px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #fff, transparent)" }}
      />

      {/* Mascot */}
      <div className="relative z-10 mt-2">
        <Mascot size={140} className="drop-shadow-lg" />
      </div>

      {/* Text */}
      <div className="relative z-10">
        <h2 className="font-sora font-bold text-xl text-white leading-tight">
          Ready to speak?
        </h2>
        <p className="text-white/60 text-base mt-1.5">
          Practice English with your AI coach
        </p>
      </div>

      {/* CTA Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={onStart}
        iconLeft={<IconMic size={18} />}
        className="relative z-10 rounded-full font-sora"
        style={{
          background: "white",
          color: "var(--color-primary)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        Start Speaking
      </Button>
    </div>
  );
}
