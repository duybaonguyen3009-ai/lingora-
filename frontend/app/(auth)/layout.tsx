/**
 * app/(auth)/layout.tsx
 *
 * Shared visual shell for unauthenticated pages: /login and /register.
 * Provides the full-screen dark background with dot-grid texture and
 * ambient colour glows that match the rest of the Lingona design system.
 *
 * Server Component — no client state needed here.
 * The root layout's <AuthProvider> still wraps this automatically.
 */

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "var(--color-bg)" }}
    >

      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(var(--color-primary-glow) 1px, transparent 1px)",
          backgroundSize:  "28px 28px",
        }}
      />

      {/* Ambient glow — top-right */}
      <div
        className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--color-primary-glow) 0%, transparent 65%)",
        }}
      />

      {/* Ambient glow — bottom-left */}
      <div
        className="absolute -bottom-40 -left-40 w-[560px] h-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, var(--color-primary-glow) 0%, transparent 65%)",
        }}
      />

      {/* Page content — centred, full width on small screens */}
      <div className="relative z-10 w-full px-4 py-12">
        {children}
      </div>

    </div>
  );
}
