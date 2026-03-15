/**
 * app/(auth)/layout.tsx
 *
 * Shared visual shell for unauthenticated pages: /login and /register.
 * Provides the full-screen dark background with dot-grid texture and
 * ambient colour glows that match the rest of the Lingora design system.
 *
 * Server Component — no client state needed here.
 * The root layout's <AuthProvider> still wraps this automatically.
 */

import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#071A2F] overflow-hidden">

      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(46,211,198,0.07) 1px, transparent 1px)",
          backgroundSize:  "28px 28px",
        }}
      />

      {/* Ambient glow — top-right (blue) */}
      <div
        className="absolute -top-40 -right-40 w-[560px] h-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(45,168,255,0.13) 0%, transparent 65%)",
        }}
      />

      {/* Ambient glow — bottom-left (cyan) */}
      <div
        className="absolute -bottom-40 -left-40 w-[560px] h-[560px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(46,211,198,0.10) 0%, transparent 65%)",
        }}
      />

      {/* Page content — centred, full width on small screens */}
      <div className="relative z-10 w-full px-4 py-12">
        {children}
      </div>

    </div>
  );
}
