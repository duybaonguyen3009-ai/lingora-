"use client";

import { useState } from "react";
import { IconX } from "./Icons";
import Mascot from "@/components/ui/Mascot";

const TIPS = [
  "Mỗi sáng luyện nói 5 phút — kiên trì quan trọng hơn luyện dài 🐙",
  "Đừng lo ngữ pháp hoàn hảo. Tập trung nói cho người khác hiểu trước nhé!",
  "Ghi âm lại rồi nghe — bạn sẽ phát hiện lỗi mà lúc nói không nghe ra đâu 🐙",
  "Luyện những âm tiếng Việt không có, như 'th' và 'r' — mỗi ngày một chút!",
];

export default function CoachTipCard() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const tip = TIPS[Math.floor(Date.now() / 86400000) % TIPS.length];

  return (
    <div
      className="relative flex items-start gap-3.5 p-5 rounded-lg"
      style={{
        backgroundColor: "var(--color-primary-soft)",
        border: "1px solid var(--color-border)",
        borderLeft: "3px solid var(--color-primary)",
      }}
    >
      <Mascot size={44} className="flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p
          className="font-semibold text-sm mb-1"
          style={{ color: "var(--color-primary)" }}
        >
          Coach tip
        </p>
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--color-text)" }}
        >
          {tip}
        </p>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded-md transition-colors hover:opacity-70"
        style={{ color: "var(--color-text-secondary)" }}
        aria-label="Dismiss tip"
      >
        <IconX size={14} />
      </button>
    </div>
  );
}
