"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Button — Lingona Design System
   ══════════════════════════════════════════════════════════════════════
   Variants:  primary | secondary | ghost | soft | success | danger
   Sizes:     sm | md | lg | icon
   Options:   fullWidth, loading, disabled, icon slots
   ══════════════════════════════════════════════════════════════════════ */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "success" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}

/* ── Variant styles ─────────────────────────────────────────────────── */
const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    "text-white border-none",
    "shadow-[0_4px_20px_rgba(99,102,241,0.25)]",
    "hover:shadow-[0_6px_24px_rgba(99,102,241,0.35)] hover:scale-[1.02]",
    "active:scale-[0.97]",
  ].join(" "),

  secondary: [
    "border",
    "hover:opacity-90",
    "active:scale-[0.97]",
  ].join(" "),

  ghost: [
    "border",
    "hover:opacity-90",
    "active:scale-[0.97]",
  ].join(" "),

  soft: [
    "border",
    "active:scale-[0.97]",
  ].join(" "),

  success: [
    "text-white border-none",
    "hover:opacity-90",
    "active:scale-[0.97]",
  ].join(" "),

  danger: [
    "text-white border-none",
    "hover:opacity-90",
    "active:scale-[0.97]",
  ].join(" "),
};

/* ── Inline styles for variants (CSS vars + gradients) ──────────────── */
const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, var(--color-primary), var(--color-accent, #3B82F6))",
  },
  secondary: {
    background: "var(--color-bg-card)",
    borderColor: "var(--color-border)",
    color: "var(--color-text)",
  },
  ghost: {
    background: "transparent",
    borderColor: "var(--color-border)",
    color: "var(--color-text-secondary)",
  },
  soft: {
    background: "var(--color-primary-soft)",
    borderColor: "var(--color-border)",
    color: "var(--color-text)",
  },
  success: {
    background: "var(--color-success)",
  },
  danger: {
    background: "#EF4444",
  },
};

/* ── Size styles ────────────────────────────────────────────────────── */
const sizeClasses: Record<ButtonSize, string> = {
  sm:   "px-4 py-2 text-sm gap-1.5",
  md:   "px-6 py-2.5 text-sm gap-2",
  lg:   "px-8 py-3 text-sm gap-2",
  icon: "w-8 h-8 p-0 text-base justify-center",
};

/* ── Component ──────────────────────────────────────────────────────── */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled = false,
      iconLeft,
      iconRight,
      children,
      className = "",
      style,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = [
      "inline-flex items-center justify-center",
      "font-semibold rounded-md",
      "transition duration-normal",
      "cursor-pointer",
      "select-none",
      isDisabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "",
      fullWidth ? "w-full" : "",
      sizeClasses[size],
      variantClasses[variant],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const mergedStyle: React.CSSProperties = {
      ...variantStyles[variant],
      ...style,
    };

    return (
      <button
        ref={ref}
        className={baseClasses}
        style={mergedStyle}
        disabled={isDisabled}
        {...rest}
      >
        {loading ? (
          <span
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-label="Loading"
          />
        ) : (
          iconLeft
        )}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
