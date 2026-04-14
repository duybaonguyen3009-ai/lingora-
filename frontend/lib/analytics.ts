/**
 * analytics.ts — Lightweight event tracking wrapper.
 *
 * Dev:  logs to console with [Analytics] prefix.
 * Prod: sends to backend /api/v1/analytics/track (when endpoint exists).
 *
 * Usage:
 *   import { trackEvent } from "@/lib/analytics";
 *   trackEvent("signup_complete", { method: "google" });
 */

const API_BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"
    : "/api/v1";

export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
) {
  const payload = {
    event: name,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      url: typeof window !== "undefined" ? window.location.pathname : "",
    },
  };

  // Always log in development
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[Analytics]", name, properties ?? "");
  }

  // In production, fire-and-forget to backend
  if (process.env.NODE_ENV === "production") {
    fetch(`${API_BASE}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // survives page unload
    }).catch(() => {
      // Silent — analytics should never block UX
    });
  }
}

// ─── Convenience helpers for common events ──────────────────────────────────

export const analytics = {
  signupComplete: (method: string) =>
    trackEvent("signup_complete", { method }),

  onboardingComplete: (targetBand: number | null, estimatedBand: number) =>
    trackEvent("onboarding_complete", { targetBand, estimatedBand }),

  onboardingSkipped: () =>
    trackEvent("onboarding_skipped"),

  firstPracticeComplete: (skill: string) =>
    trackEvent("first_practice_complete", { skill }),

  lessonComplete: (lessonId: string, score: number) =>
    trackEvent("lesson_complete", { lessonId, score }),

  dailyLimitHit: (skill: string) =>
    trackEvent("daily_limit_hit", { skill }),

  proUpgradeClick: (source: string) =>
    trackEvent("pro_upgrade_click", { source }),

  proTrialStart: () =>
    trackEvent("pro_trial_start"),

  battleComplete: (result: "win" | "lose" | "draw") =>
    trackEvent("battle_complete", { result }),

  sessionStart: () =>
    trackEvent("session_start"),

  sessionEnd: (durationSeconds: number) =>
    trackEvent("session_end", { durationSeconds }),

  pageView: (page: string) =>
    trackEvent("page_view", { page }),
};
