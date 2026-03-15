"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lingora_guest_id";

/**
 * Returns the guest user UUID from localStorage, creating one if it doesn't
 * exist yet. Safe to call on both client and server — returns null on the
 * server or before hydration.
 */
export function getGuestUserId(): string | null {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/**
 * Removes the guest UUID from localStorage after a successful migration to
 * a real account. Safe to call on the server (no-op) or when the key is absent.
 */
export function clearGuestUserId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * SSR-safe hook that returns the guest UUID after hydration.
 * Returns null during SSR / before the first client render.
 */
export function useGuestUser(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setUserId(getGuestUserId());
  }, []);

  return userId;
}
