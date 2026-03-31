"use client";

import React, { useEffect, useState } from "react";

/* Toast — Lingona Design System
   Auto-dismissing notification.

   Usage:
     <Toast variant="success" message="Lesson complete!" duration={4000} onClose={fn} />
*/

export type ToastVariant = "success" | "info" | "warning" | "error";

interface ToastProps {
  variant?: ToastVariant;
  message: string;
  duration?: number;
  onClose: () => void;
}

const variantConfig: Record<ToastVariant, { bg: string; border: string; color: string; icon: string }> = {
  success: {
    bg: "var(--color-success-soft)",
    border: "color-mix(in srgb, var(--color-success) 25%, transparent)",
    color: "var(--color-success)",
    icon: "\u2713",
  },
  info: {
    bg: "var(--color-accent-soft)",
    border: "color-mix(in srgb, var(--color-accent) 25%, transparent)",
    color: "var(--color-accent)",
    icon: "\u2139",
  },
  warning: {
    bg: "var(--color-warning-soft)",
    border: "color-mix(in srgb, var(--color-warning) 25%, transparent)",
    color: "var(--color-warning)",
    icon: "\u26A0",
  },
  error: {
    bg: "var(--color-error-soft)",
    border: "color-mix(in srgb, var(--color-error) 25%, transparent)",
    color: "var(--color-error)",
    icon: "\u2715",
  },
};

const Toast: React.FC<ToastProps> = ({ variant = "success", message, duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Enter animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = variantConfig[variant];

  return (
    <div
      className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-md backdrop-blur-md shadow-lg transition-all duration-normal"
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-12px)",
      }}
      role="alert"
      aria-live="polite"
    >
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: config.border, color: config.color }}
      >
        {config.icon}
      </span>
      <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
        {message}
      </p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="ml-2 text-xs opacity-60 hover:opacity-100 transition-opacity"
        style={{ color: "var(--color-text-secondary)" }}
        aria-label="Dismiss"
      >
        {"\u2715"}
      </button>
    </div>
  );
};

export default Toast;
