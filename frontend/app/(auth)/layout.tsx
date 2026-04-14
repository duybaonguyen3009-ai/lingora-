/**
 * app/(auth)/layout.tsx — Navy gradient background for login/register
 */

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-dvh flex items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(160deg, var(--color-bg) 0%, var(--color-bg) 60%, rgba(0,168,150,0.04) 100%)",
      }}
    >

      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(0,168,150,0.08) 1px, transparent 1px)",
          backgroundSize:  "28px 28px",
        }}
      />

      {/* Ambient glow — top-right (teal) */}
      <div
        className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,168,150,0.10) 0%, transparent 65%)",
        }}
      />

      {/* Ambient glow — bottom-left (navy) */}
      <div
        className="absolute -bottom-40 -left-40 w-[560px] h-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(27,43,75,0.08) 0%, transparent 65%)",
        }}
      />

      {/* Page content */}
      <div className="relative z-10 w-full px-4 py-12">
        {children}
      </div>

    </div>
  );
}
