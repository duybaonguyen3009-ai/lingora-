"use client";

/**
 * components/ProtectedRoute.tsx
 *
 * Auth guard component.  Wrap any page or section that requires a signed-in
 * user — e.g. settings, classroom management, profile pages.
 *
 * Behaviour:
 *   isLoading  → shows a full-screen spinner while AuthProvider restores
 *                the session from the httpOnly refresh cookie.
 *   no user    → redirects to /login once session restoration completes.
 *   user set   → renders {children} normally.
 *
 * NOTE: the main dashboard at / is intentionally NOT wrapped with this
 * component because it supports guest access. Use ProtectedRoute only
 * for pages that make no sense without an account.
 *
 * Usage:
 *   export default function SettingsPage() {
 *     return (
 *       <ProtectedRoute>
 *         <SettingsContent />
 *       </ProtectedRoute>
 *     );
 *   }
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";

interface ProtectedRouteProps {
  children:    React.ReactNode;
  /** Override the redirect target (defaults to "/login"). */
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  // Session restore still in flight — block render with a spinner
  if (isLoading) {
    return <AuthLoader />;
  }

  // Redirect queued — render nothing to avoid a flash of protected content
  if (!user) {
    return null;
  }

  return <>{children}</>;
}

// ─── Full-screen loading indicator ───────────────────────────────────────────

function AuthLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="flex flex-col items-center gap-4">

        {/* Spinning ring that matches the accent colour */}
        <div
          className="w-10 h-10 rounded-full animate-spin"
          style={{ border: "3px solid var(--color-border)", borderTopColor: "var(--color-success)" }}
          aria-hidden="true"
        />

        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading…</p>
      </div>
    </div>
  );
}
