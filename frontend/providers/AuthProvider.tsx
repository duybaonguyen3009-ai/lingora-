"use client";

/**
 * providers/AuthProvider.tsx
 *
 * Client component that restores the user's session on every page load by
 * firing POST /auth/refresh against the httpOnly refresh cookie set by the
 * backend.
 *
 * Lifecycle:
 *   1. authStore initialises with isLoading: true.
 *   2. This component mounts (client-side only — "use client").
 *   3. refreshSession() calls POST /auth/refresh with credentials:"include".
 *      a. Cookie present + valid  → setAuth(user, token)  → isLoading: false
 *      b. No cookie / expired     → catch → clearAuth()   → isLoading: false
 *   4. All UI gated on !isLoading can now render correctly.
 *
 * Usage:  wrap the root layout body so every page benefits automatically.
 */

import { useEffect } from "react";
import { refreshSession } from "@/lib/api";
import { useAuthStore }   from "@/lib/stores/authStore";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    refreshSession().catch(() => {
      // No valid refresh cookie — normal for first-time / guest visitors.
      // clearAuth() flips isLoading → false so the UI stops waiting.
      useAuthStore.getState().clearAuth();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
