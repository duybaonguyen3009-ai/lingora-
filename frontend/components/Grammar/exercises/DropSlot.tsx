/**
 * DropSlot.tsx
 *
 * Reusable droppable target slot for grammar exercises.
 * Uses @dnd-kit/core useDroppable hook.
 *
 * Premium feel: glowing border on hover, magnetic pull effect,
 * pulsing empty state, satisfying filled state with elevation,
 * correct/wrong micro-feedback animations.
 */

"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DropSlotProps {
  id: string;
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  variant?: "empty" | "filled" | "correct" | "wrong";
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DropSlot({
  id,
  children,
  placeholder = "Drop here",
  disabled = false,
  variant = "empty",
  className,
}: DropSlotProps) {
  const { isOver, setNodeRef } = useDroppable({ id, disabled });

  const isEmpty = !children;

  // Border + background + shadow per state
  let borderColor: string;
  let bgColor: string;
  let shadow: string;

  if (variant === "correct") {
    borderColor = "rgba(16,185,129,0.5)";
    bgColor = "rgba(16,185,129,0.08)";
    shadow = "0 0 16px rgba(16,185,129,0.2), inset 0 0 8px rgba(16,185,129,0.06)";
  } else if (variant === "wrong") {
    borderColor = "rgba(239,68,68,0.5)";
    bgColor = "rgba(239,68,68,0.08)";
    shadow = "0 0 16px rgba(239,68,68,0.15), inset 0 0 8px rgba(239,68,68,0.05)";
  } else if (isOver) {
    borderColor = "rgba(46,211,198,0.7)";
    bgColor = "rgba(46,211,198,0.1)";
    shadow = "0 0 24px rgba(46,211,198,0.3), inset 0 0 14px rgba(46,211,198,0.1)";
  } else if (variant === "filled") {
    borderColor = "rgba(46,211,198,0.35)";
    bgColor = "rgba(46,211,198,0.05)";
    shadow = "0 2px 8px rgba(0,0,0,0.06)";
  } else {
    // Empty — violet-tinted with gentle pulse
    borderColor = "rgba(139,92,246,0.25)";
    bgColor = "rgba(139,92,246,0.04)";
    shadow = "inset 0 0 12px rgba(139,92,246,0.06)";
  }

  return (
    <>
      {/* Scoped keyframes for feedback micro-animations */}
      <style>{`
        @keyframes grammar-slot-correct {
          0% { transform: scale(1); }
          40% { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        @keyframes grammar-slot-wrong {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-2px); }
          80% { transform: translateX(2px); }
        }
        @keyframes grammar-slot-breathe {
          0%, 100% { border-color: rgba(139,92,246,0.2); }
          50% { border-color: rgba(139,92,246,0.35); }
        }
      `}</style>
      <div
        ref={setNodeRef}
        className={cn(
          "rounded-xl border-2 px-3 py-2 min-h-[42px] min-w-[80px] flex items-center justify-center",
          "transition duration-normal ease-out",
          isEmpty && variant === "empty" && "border-dashed",
          !isEmpty && "border-solid",
          isOver && "scale-[1.05]",
          variant === "correct" && "border-solid",
          variant === "wrong" && "border-solid",
          className
        )}
        style={{
          borderColor,
          background: bgColor,
          boxShadow: shadow,
          animation:
            variant === "correct"
              ? "grammar-slot-correct 0.35s ease-out"
              : variant === "wrong"
              ? "grammar-slot-wrong 0.4s ease-out"
              : isEmpty && variant === "empty" && !isOver
              ? "grammar-slot-breathe 3s ease-in-out infinite"
              : undefined,
        }}
      >
        {isEmpty ? (
          <span
            className={cn(
              "text-xs font-medium",
              isOver ? "opacity-0" : "opacity-60"
            )}
            style={{ color: "rgba(139,92,246,0.6)" }}
          >
            {placeholder}
          </span>
        ) : (
          children
        )}
      </div>
    </>
  );
}
