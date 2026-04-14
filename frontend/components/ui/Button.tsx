"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Button — Lingona Design System (Navy + Teal)
   ══════════════════════════════════════════════════════════════════════
   Variants:  primary | secondary | ghost | soft | success | danger
   Sizes:     sm | md | lg | icon
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
    "shadow-colored",
    "hover:shadow-[0_6px_20px_rgba(0,168,150,0.35)] hover:scale-[1.02]",
    "active:scale-[0.97]",
  ].join(" "),

  secondary: [
    "border",
    "hover:text-white",
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
    background: "linear-gradient(135deg, #00A896 0%, #00C4B0 100%)",
  },
  secondary: {
    background: "transparent",
    borderColor: "#1B2B4B",
    color: "#1B2B4B",
  },
  ghost: {
    background: "transparent",
    borderColor: "var(--color-border)",
    color: "var(--color-text-secondary)",
  },
  soft: {
    background: "var(--color-accent-soft)",
    borderColor: "var(--color-border)",
    color: "var(--color-text)",
  },
  success: {
    background: "#22C55E",
  },
  danger: {
    background: "#EF4444",
  },
};

/* ── Size styles ────────────────────────────────────────────────────── */
const sizeClasses: Record<ButtonSize, string> = {
  sm:   "px-4 py-2 text-sm gap-1.5",
  md:   "px-6 py-2.5 text-sm gap-2",
  lg:   "px-8 py-3 text-base gap-2",
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
      onMouseEnter,
      onMouseLeave,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const baseClasses = [
      "inline-flex items-center justify-center",
      "font-semibold rounded-full",
      "transition-[transform,box-shadow,opacity] duration-normal",
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

    // Secondary hover: fill with navy
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "secondary" && !isDisabled) {
        e.currentTarget.style.background = "#1B2B4B";
        e.currentTarget.style.borderColor = "#1B2B4B";
      }
      onMouseEnter?.(e);
    };
    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (variant === "secondary" && !isDisabled) {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "#1B2B4B";
        e.currentTarget.style.color = "#1B2B4B";
      }
      onMouseLeave?.(e);
    };

    return (
      <button
        ref={ref}
        className={baseClasses}
        style={mergedStyle}
        disabled={isDisabled}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
