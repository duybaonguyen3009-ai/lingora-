"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Badge — Lingona Design System
   ══════════════════════════════════════════════════════════════════════
   Small colored pill for labels, tags, statuses.

   Variants:  primary | success | warning | error | info | muted
   Sizes:     sm | md
   ══════════════════════════════════════════════════════════════════════ */

export type BadgeVariant = "primary" | "success" | "warning" | "error" | "info" | "muted";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  primary: {
    bg: "var(--color-primary-soft)",
    color: "var(--color-primary)",
    border: "transparent",
  },
  success: {
    bg: "var(--color-success-soft)",
    color: "var(--color-success)",
    border: "transparent",
  },
  warning: {
    bg: "var(--color-warning-soft)",
    color: "var(--color-warning)",
    border: "transparent",
  },
  error: {
    bg: "var(--color-error-soft)",
    color: "var(--color-error)",
    border: "transparent",
  },
  info: {
    bg: "var(--color-accent-soft)",
    color: "var(--color-accent)",
    border: "transparent",
  },
  muted: {
    bg: "var(--color-primary-soft)",
    color: "var(--color-text-secondary)",
    border: "var(--color-border)",
  },
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-xs",
};

const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  size = "sm",
  children,
  className = "",
  style,
}) => {
  const vs = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full ${sizeClasses[size]} ${className}`}
      style={{
        background: vs.bg,
        color: vs.color,
        border: `1px solid ${vs.border}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export default Badge;
