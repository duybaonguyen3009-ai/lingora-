"use client";

import { IconAI, IconChat } from "./Icons";

export default function AiTutorCard() {
  return (
    <div
      className="relative rounded-[16px] p-5 overflow-hidden cursor-pointer group"
      style={{
        background: "linear-gradient(135deg, #0D2840 0%, #102A43 100%)",
        border: "1px solid rgba(45,168,255,0.2)",
        transition: "border-color 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(45,168,255,0.35)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(45,168,255,0.2)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      {/* Glow blob */}
      <div
        className="absolute -right-8 -top-8 w-[120px] h-[120px] pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(45,168,255,0.15) 0%, transparent 65%)" }}
      />

      {/* AI chip */}
      <div className="inline-flex items-center gap-[5px] bg-[#2DA8FF]/12 border border-[#2DA8FF]/25 text-[#2DA8FF] text-[10px] font-bold uppercase tracking-[0.8px] px-[9px] py-[3px] rounded-[20px] mb-3">
        <IconAI />
        AI-Powered
      </div>

      <h4 className="font-sora font-bold text-[15px] leading-[1.3] mb-1.5">
        Chat with Your<br />AI Language Tutor
      </h4>

      <p className="text-[12.5px] text-[#A6B3C2] leading-[1.5] mb-4">
        Get personalized feedback, practice conversations, and receive instant corrections from your intelligent tutor.
      </p>

      <button
        className="inline-flex items-center gap-1.5 bg-[#2DA8FF]/15 border border-[#2DA8FF]/30 text-[#2DA8FF] rounded-[10px] px-4 py-2 text-[12.5px] font-semibold transition-all duration-200 hover:bg-[#2DA8FF]/25"
      >
        <IconChat />
        Start Session
      </button>
    </div>
  );
}
