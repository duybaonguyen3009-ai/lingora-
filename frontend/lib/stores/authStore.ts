/**
 * lib/stores/authStore.ts
 *
 * Zustand store for authentication state.
 *
 * Token strategy (locked in CLAUDE.md):
 *   accessToken  – short-lived JWT (15 min). Lives here in memory only.
 *                  Never written to localStorage or sessionStorage.
 *   refreshToken – long-lived random value, stored as an httpOnly
 *                  SameSite=Strict cookie managed entirely by the backend.
 *                  This store never sees or touches it.
 *
 * isLoading is true until the initial session-restoration call to
 * POST /auth/refresh completes (success OR failure). UI should gate
 * rendering on !isLoading to prevent flickering between guest / auth states.
 */

import { create } from "zustand";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id:         string;
  email:      string;
  name:       string;
  role:       "kid" | "teacher" | "parent" | "admin";
  avatar_url: string | null;
  created_at: string;
}

interface AuthState {
  /** The authenticated user, or null when logged out / guest. */
  user:        AuthUser | null;
  /** The current JWT access token, or null when unauthenticated. */
  accessToken: string | null;
  /**
   * True from app start until the initial silent refresh completes.
   * Use this to avoid rendering auth-gated UI before we know the user's state.
   */
  isLoading:   boolean;

  // ── Actions ──────────────────────────────────────────────────────────────
  /** Called after a successful login, register, or token refresh. */
  setAuth:     (user: AuthUser, accessToken: string) => void;
  /** Called on logout or when a refresh attempt fails. */
  clearAuth:   () => void;
  /** Flips the loading flag — used by AuthProvider during init. */
  setLoading:  (loading: boolean) => void;
  /** Merge partial fields into the current user (e.g. after avatar upload). */
  patchUser:   (fields: Partial<AuthUser>) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set) => ({
  user:        null,
  accessToken: null,
  isLoading:   true,   // stay true until AuthProvider's useEffect resolves

  setAuth: (user, accessToken) =>
    set({ user, accessToken, isLoading: false }),

  clearAuth: () =>
    set({ user: null, accessToken: null, isLoading: false }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  patchUser: (fields) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...fields } : null,
    })),
}));
