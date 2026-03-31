"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Card — Lingona Design System
   ══════════════════════════════════════════════════════════════════════
   Variants:  default | elevated | ghost | interactive
   Padding:   none | sm | md | lg
   ══════════════════════════════════════════════════════════════════════ */

export type CardVariant = "default" | "elevated" | "ghost" | "interactive";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  children: React.ReactNode;
}

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", children, className = "", style, ...rest }, ref) => {
    const baseClasses = [
      "rounded-lg",
      paddingClasses[padding],
      variant === "interactive" ? "card-hover cursor-pointer" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const variantStyles: React.CSSProperties =
      variant === "ghost"
        ? {}
        : {
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            ...(variant === "elevated"
              ? { boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }
              : {}),
          };

    return (
      <div
        ref={ref}
        className={baseClasses}
        style={{ ...variantStyles, ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
