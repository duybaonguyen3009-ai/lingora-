"use client";

/**
 * Toggle — 40×22 switch, teal when on, muted when off.
 * Uses canonical palette tokens from PR4a.
 */

type Props = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export default function Toggle({ checked, onChange, disabled, ...rest }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest["aria-label"]}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex items-center rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: 40,
        height: 22,
        background: checked ? "var(--color-teal)" : "var(--color-bg-secondary)",
        border: checked ? "none" : "1px solid var(--color-border)",
      }}
    >
      <span
        className="inline-block rounded-full transition-transform duration-200"
        style={{
          width: 17,
          height: 17,
          background: "#F7F4EC",
          transform: checked ? "translateX(20px)" : "translateX(2px)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
