"use client";

import React from "react";

/* ══════════════════════════════════════════════════════════════════════
   Input — Lingona Design System
   ══════════════════════════════════════════════════════════════════════
   Consistent text input with theme-aware colors and focus ring.

   Sizes:  sm | md | lg
   ══════════════════════════════════════════════════════════════════════ */

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Input size */
  inputSize?: InputSize;
  /** Error state */
  error?: boolean;
  /** Full width */
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
      "transition-all duration-normal",
      "[color-scheme:dark]",
      fullWidth ? "w-full" : "",
      sizeClasses[inputSize],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const inputStyle: React.CSSProperties = {
      background: "var(--color-bg-secondary)",
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
      "transition-all duration-normal",
      "px-4 py-3 text-sm resize-none",
      "[color-scheme:dark]",
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const textareaStyle: React.CSSProperties = {
      background: "var(--color-bg-secondary)",
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
