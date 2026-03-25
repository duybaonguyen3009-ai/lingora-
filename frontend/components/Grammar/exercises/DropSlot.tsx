/**
 * DropSlot.tsx
 *
 * Reusable droppable target slot for grammar exercises.
 * Uses @dnd-kit/core useDroppable hook.
 * Shows visual highlight when a draggable is hovering over it.
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
  /** Placeholder text when empty. */
  placeholder?: string;
  disabled?: boolean;
  /** Visual variant for feedback states. */
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

  const borderColor =
    variant === "correct"
      ? "rgba(16,185,129,0.5)"
      : variant === "wrong"
      ? "rgba(239,68,68,0.5)"
      : isOver
      ? "rgba(46,211,198,0.6)"
      : "var(--color-border)";

  const bgColor =
    variant === "correct"
      ? "rgba(16,185,129,0.08)"
      : variant === "wrong"
      ? "rgba(239,68,68,0.08)"
      : isOver
      ? "rgba(46,211,198,0.08)"
      : "rgba(46,211,198,0.03)";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl border-2 border-dashed px-3 py-2 min-h-[40px] min-w-[80px] flex items-center justify-center transition-all duration-150",
        isOver && "scale-[1.02]",
        variant !== "empty" && "border-solid",
        className
      )}
      style={{ borderColor, background: bgColor }}
    >
      {isEmpty ? (
        <span className="text-[12px] italic" style={{ color: "var(--color-text-secondary)" }}>
          {placeholder}
        </span>
      ) : (
        children
      )}
    </div>
  );
}
