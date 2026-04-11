"use client";

import { IconHome, IconMic, IconBook, IconGraduationCap, IconUsers, IconUser } from "./Icons";
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
  { id: "social", label: "Friends", Icon: IconUsers },
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
            className="flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-all duration-normal active:scale-95"
          >
            <div
              className="flex items-center justify-center rounded-xl transition-all duration-normal"
              style={{
                width: 40,
                height: 40,
                backgroundColor: isActive ? "rgba(0, 168, 150, 0.10)" : "transparent",
                transform: isActive ? "scale(1.1)" : "scale(1)",
                color: isActive ? "#00A896" : "var(--color-text-tertiary)",
              }}
            >
              <Icon size={24} />
            </div>
            <span
              className="text-xs transition-colors duration-normal"
              style={{
                color: isActive ? "#00A896" : "var(--color-text-tertiary)",
                fontWeight: isActive ? 700 : 500,
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
