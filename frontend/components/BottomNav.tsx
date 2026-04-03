"use client";

import { IconHome, IconMic, IconBook, IconGraduationCap, IconUser } from "./Icons";
import useSound from "@/hooks/useSound";

interface BottomNavProps {
  active: string;
  onChange: (id: string) => void;
}

const NAV_ITEMS = [
  { id: "home", label: "Home", Icon: IconHome },
  { id: "speak", label: "Speak", Icon: IconMic },
  { id: "practice", label: "Grammar", Icon: IconBook },
  { id: "exam", label: "Exam", Icon: IconGraduationCap },
  { id: "profile", label: "Profile", Icon: IconUser },
] as const;

export default function BottomNav({ active, onChange }: BottomNavProps) {
  const { play } = useSound();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around h-[68px] px-1"
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = active === id;

        return (
          <button
            key={id}
            onClick={() => { play("click", 0.2); onChange(id); }}
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition duration-normal active:scale-95"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl transition duration-normal"
              style={{
                width: 36,
                height: 36,
                backgroundColor: isActive ? "var(--color-primary-soft)" : "transparent",
              }}
            >
              <Icon size={20} />
            </div>
            <span
              className="text-xs font-semibold transition-colors duration-normal"
              style={{
                color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
