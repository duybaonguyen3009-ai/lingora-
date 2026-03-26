/**
 * DropSlot.tsx
 *
 * Reusable droppable target slot for grammar exercises.
 * Uses @dnd-kit/core useDroppable hook.
 *
 * Premium feel: glowing border on hover, magnetic pull effect,
 * pulsing empty state, satisfying filled state with elevation.
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
    shadow = "0 0 16px rgba(16,185,129,0.15), inset 0 0 8px rgba(16,185,129,0.05)";
  } else if (variant === "wrong") {
    borderColor = "rgba(239,68,68,0.5)";
    bgColor = "rgba(239,68,68,0.08)";
    shadow = "0 0 16px rgba(239,68,68,0.12), inset 0 0 8px rgba(239,68,68,0.04)";
  } else if (isOver) {
    borderColor = "rgba(46,211,198,0.7)";
    bgColor = "rgba(46,211,198,0.1)";
    shadow = "0 0 20px rgba(46,211,198,0.25), inset 0 0 12px rgba(46,211,198,0.08)";
  } else if (variant === "filled") {
    borderColor = "rgba(46,211,198,0.35)";
    bgColor = "rgba(46,211,198,0.05)";
    shadow = "0 2px 8px rgba(0,0,0,0.06)";
  } else {
    borderColor = "rgba(139,92,246,0.25)";
    bgColor = "rgba(139,92,246,0.04)";
    shadow = "inset 0 0 12px rgba(139,92,246,0.06)";
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 px-3 py-2 min-h-[42px] min-w-[80px] flex items-center justify-center",
        "transition-all duration-200 ease-out",
        isEmpty && variant === "empty" && "border-dashed",
        !isEmpty && "border-solid",
        isOver && "scale-[1.04]",
        variant === "correct" && "border-solid",
        variant === "wrong" && "border-solid",
        className
      )}
      style={{ borderColor, background: bgColor, boxShadow: shadow }}
    >
      {isEmpty ? (
        <span
          className={cn(
            "text-[12px] font-medium",
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
  );
}
