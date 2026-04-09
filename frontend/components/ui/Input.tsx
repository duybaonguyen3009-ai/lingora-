"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Input — Lingona Design System (Navy + Teal)
   ══════════════════════════════════════════════════════════════════════
   Focus: teal border + teal ring. Gray-200 border default.
   ══════════════════════════════════════════════════════════════════════ */

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: InputSize;
  error?: boolean;
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-4 text-base",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ inputSize = "md", error = false, fullWidth = true, className = "", style, ...rest }, ref) => {
    const classes = [
      "rounded-md border outline-none",
      "transition duration-normal",
      "focus:ring-2 focus:ring-[#00A896]/20 focus:border-[#00A896]",
      fullWidth ? "w-full" : "",
      sizeClasses[inputSize],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const inputStyle: React.CSSProperties = {
      background: "var(--color-bg-card)",
      borderColor: error ? "var(--color-error)" : "var(--color-border)",
      color: "var(--color-text)",
      ...style,
    };

    return (
      <input
        ref={ref}
        className={classes}
        style={inputStyle}
        {...rest}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;

/* ── Textarea variant ─────────────────────────────────────────────── */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error = false, fullWidth = true, className = "", style, ...rest }, ref) => {
    const classes = [
      "rounded-md border outline-none",
      "transition duration-normal",
      "px-4 py-3 text-sm resize-none",
      "focus:ring-2 focus:ring-[#00A896]/20 focus:border-[#00A896]",
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const textareaStyle: React.CSSProperties = {
      background: "var(--color-bg-card)",
      borderColor: error ? "var(--color-error)" : "var(--color-border)",
      color: "var(--color-text)",
      ...style,
    };

    return (
      <textarea
        ref={ref}
        className={classes}
        style={textareaStyle}
        {...rest}
      />
    );
  }
);

Textarea.displayName = "Textarea";
