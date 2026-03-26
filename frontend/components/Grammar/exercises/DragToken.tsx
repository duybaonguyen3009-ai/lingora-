/**
 * DragToken.tsx
 *
 * Reusable draggable word/phrase token for grammar exercises.
 * Uses @dnd-kit/core useDraggable hook.
 *
 * Premium feel: elevated surface, hover lift, grab cursor,
 * smooth shadow transitions, glow on drag.
 */

"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DragTokenProps {
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "default" | "placed" | "correct" | "wrong";
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Styles per variant
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<string, React.CSSProperties> = {
  default: {
    background: "var(--color-primary-soft)",
    borderColor: "var(--color-border)",
    color: "var(--color-text)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
  },
  placed: {
    background: "rgba(46,211,198,0.1)",
    borderColor: "rgba(46,211,198,0.3)",
    color: "var(--color-success)",
    boxShadow: "0 2px 8px rgba(46,211,198,0.15)",
  },
  correct: {
    background: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.4)",
    color: "#10B981",
    boxShadow: "0 0 12px rgba(16,185,129,0.2), 0 2px 6px rgba(16,185,129,0.1)",
  },
  wrong: {
    background: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.4)",
    color: "#EF4444",
    boxShadow: "0 0 12px rgba(239,68,68,0.15), 0 2px 6px rgba(239,68,68,0.08)",
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DragToken({
  id,
  children,
  disabled = false,
  variant = "default",
  data,
}: DragTokenProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    disabled,
    data: data ?? {},
  });

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      className={cn(
        "px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold select-none",
        "transition-all duration-200 ease-out",
        !disabled && "cursor-grab active:cursor-grabbing hover:scale-[1.04] hover:-translate-y-0.5",
        disabled && "cursor-default opacity-50",
        isDragging && "opacity-20 scale-90"
      )}
      style={{
        ...VARIANT_STYLES[variant],
        ...(disabled
          ? { boxShadow: "none" }
          : {}),
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay version (rendered inside DragOverlay during active drag)
// ---------------------------------------------------------------------------

export function DragTokenOverlay({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "placed" | "correct" | "wrong";
}) {
  return (
    <div
      className="px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold select-none scale-110"
      style={{
        ...VARIANT_STYLES[variant],
        boxShadow:
          "0 12px 32px rgba(0,0,0,0.25), 0 0 20px rgba(46,211,198,0.2), 0 4px 8px rgba(0,0,0,0.15)",
        zIndex: 9999,
        transform: "scale(1.08)",
        borderColor: "rgba(46,211,198,0.5)",
      }}
    >
      {children}
    </div>
  );
}
