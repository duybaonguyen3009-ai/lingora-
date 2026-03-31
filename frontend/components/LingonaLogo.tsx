"use client";

/**
 * LingonaLogo.tsx
 *
 * Inline SVG soundwave logo mark for Lingona.
 * No external image dependency — renders at any size.
 */

interface LingonaLogoProps {
  size?: number;
  className?: string;
}

export default function LingonaLogo({ size = 40, className = "" }: LingonaLogoProps) {
  // Scale bar dimensions relative to a 44x44 viewbox
  return (
    <div
      className={`flex items-center justify-center rounded-md ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, var(--color-primary) 0%, #5B3FBF 100%)",
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="6" y="16" width="4" height="12" rx="2" fill="white" opacity="0.7" />
        <rect x="13" y="10" width="4" height="24" rx="2" fill="white" opacity="0.85" />
        <rect x="20" y="6" width="4" height="32" rx="2" fill="white" />
        <rect x="27" y="10" width="4" height="24" rx="2" fill="white" opacity="0.85" />
        <rect x="34" y="16" width="4" height="12" rx="2" fill="white" opacity="0.7" />
      </svg>
    </div>
  );
}
