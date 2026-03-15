"use client";

/**
 * hooks/useCurrentUserId.ts
 *
 * Returns the effective user ID for progress tracking:
 *
 *   authenticated user  → real UUID from the auth store
 *   guest               → ephemeral UUID from localStorage (via useGuestUser)
 *   before hydration    → null (prevents premature API calls)
 *
 * This hook is the single source of truth for "who is currently using the app",
 * used by useProgress, completeLesson, and any other call that needs a userId.
 * It removes the need for callers to know whether the user is logged in or not.
 */

import { useAuthStore } from "@/lib/stores/authStore";
import { useGuestUser } from "@/lib/guestUser";

export function useCurrentUserId(): string | null {
  // Zustand selector — re-renders only when the user id changes
  const authUserId = useAuthStore((s) => s.user?.id ?? null);
  const guestId    = useGuestUser();

  // Authenticated user takes priority over the guest UUID
  return authUserId ?? guestId;
}
