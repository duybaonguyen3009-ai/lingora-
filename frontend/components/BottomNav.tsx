"use client";

import { IconHome, IconMic, IconBook, IconUser } from "./Icons";

interface BottomNavProps {
  active: string;
  onChange: (id: string) => void;
}

const NAV_ITEMS = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "speak", label: "Speak", Icon: IconMic },
  { id: "practice", label: "Practice", Icon: IconBook },
  { id: "profile", label: "Profile", Icon: IconUser },
] as const;

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-16 px-2"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        const isSpeakButton = id === "speak";

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
            }}
          >
            <div
              className="flex items-center justify-center rounded-full transition-all"
              style={{
                width: isSpeakButton ? 44 : 32,
                height: isSpeakButton ? 44 : 32,
                backgroundColor: isSpeakButton
                  ? isActive ? "var(--color-primary)" : "var(--color-primary-soft)"
                  : "transparent",
                color: isSpeakButton
                  ? isActive ? "#fff" : "var(--color-primary)"
                  : undefined,
                boxShadow: isSpeakButton && isActive
                  ? "0 0 16px var(--color-primary-glow)"
                  : "none",
                marginTop: isSpeakButton ? -12 : 0,
              }}
            >
              <Icon size={isSpeakButton ? 22 : 20} />
            </div>
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
