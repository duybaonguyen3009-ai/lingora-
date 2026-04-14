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
        background: "linear-gradient(135deg, #1B2B4B 0%, #2D4A7A 50%, #3B5998 100%)",
        minHeight: "280px",
      }}
    >
      {/* Subtle glow circles */}
      <div
        className="absolute top-[-40px] right-[-40px] w-[220px] h-[220px] rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #00A896, transparent)" }}
      />
      <div
        className="absolute bottom-[-30px] left-[-30px] w-[140px] h-[140px] rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #00C4B0, transparent)" }}
      />

      {/* Mascot — 20% larger */}
      <div className="relative z-10 mt-2" style={{ filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.3))" }}>
        <Mascot size={168} className="drop-shadow-lg" />
      </div>

      {/* Text */}
      <div className="relative z-10">
        <h2 className="font-display font-bold text-3xl text-white leading-tight">
          Sẵn sàng nói chưa?
        </h2>
        <p className="text-white/60 text-base mt-1.5">
          Luyện nói cùng AI coach của bạn 🐙
        </p>
      </div>

      {/* CTA Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={onStart}
        iconLeft={<IconMic size={18} />}
        className="relative z-10 rounded-full font-sans"
        style={{
          background: "white",
          color: "#00A896",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}
      >
        Bắt đầu nói
      </Button>
    </div>
  );
}
