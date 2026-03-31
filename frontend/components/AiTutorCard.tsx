"use client";

import { IconAI, IconChat } from "./Icons";

export default function AiTutorCard() {
  return (
    <div
      className="relative rounded-lg p-5 overflow-hidden cursor-pointer group"
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
      <div className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.8px] px-2 py-1 rounded-lg mb-3" style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)", color: "var(--color-accent)" }}>
        <IconAI />
        AI-Powered
      </div>

      <h4 className="font-sora font-bold text-base leading-[1.3] mb-1.5">
        Chat with Your<br />AI Language Tutor
      </h4>

      <p className="text-xs leading-[1.5] mb-4" style={{ color: "var(--color-text-muted)" }}>
        Get personalized feedback, practice conversations, and receive instant corrections from your intelligent tutor.
      </p>

      <button
        className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-semibold transition-all duration-normal"
        style={{ background: "color-mix(in srgb, var(--color-accent) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)", color: "var(--color-accent)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--color-accent) 25%, transparent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--color-accent) 15%, transparent)"; }}
      >
        <IconChat />
        Start Session
      </button>
    </div>
  );
}
