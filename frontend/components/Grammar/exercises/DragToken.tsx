/**
 * DragToken.tsx
 *
 * Reusable draggable word/phrase token for grammar exercises.
 * Uses @dnd-kit/core useDraggable hook.
 * Shows visual feedback during drag (opacity change, scale).
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
  /** Extra data attached to the draggable (accessible in onDragEnd). */
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
  },
  placed: {
    background: "rgba(46,211,198,0.1)",
    borderColor: "rgba(46,211,198,0.3)",
    color: "var(--color-success)",
  },
  correct: {
    background: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.4)",
    color: "#10B981",
  },
  wrong: {
    background: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.4)",
    color: "#EF4444",
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
        "px-3 py-2 rounded-lg border text-[13px] font-semibold transition-all duration-150 select-none",
        !disabled && "cursor-grab active:cursor-grabbing",
        disabled && "cursor-default",
        isDragging && "opacity-30 scale-95"
      )}
      style={VARIANT_STYLES[variant]}
      role="button"
      tabIndex={disabled ? -1 : 0}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay version (used inside DragOverlay — no hooks, just styled)
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
      className="px-3 py-2 rounded-lg border text-[13px] font-semibold select-none shadow-lg scale-105"
      style={{
        ...VARIANT_STYLES[variant],
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        zIndex: 9999,
      }}
    >
      {children}
    </div>
  );
}
