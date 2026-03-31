"use client";

/**
 * app/(auth)/login/page.tsx  →  URL: /login
 *
 * Email + password login form.
 * On success: callss loginUser() which updates the Zustand store,
 * then redirects to the dashboard at /.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, migrateGuestProgress } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { getGuestUserId, clearGuestUserId } from "@/lib/guestUser";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router     = useRouter();
  const user       = useAuthStore((s) => s.user);
  const authReady  = !useAuthStore((s) => s.isLoading);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  // Already authenticated → send to dashboard
  useEffect(() => {
    if (authReady && user) router.replace("/");
  }, [authReady, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim())  { setError("Email is required.");    return; }
    if (!password)      { setError("Password is required."); return; }

    setSubmitting(true);
    try {
      await loginUser({ email: email.trim().toLowerCase(), password });

      // Migrate any progress accumulated as a guest into the real account.
      // Non-critical: swallow errors so a migration hiccup never blocks login.
      const guestId = getGuestUserId();
      if (guestId) {
        await migrateGuestProgress(guestId).catch(() => {});
        clearGuestUserId();
      }

      router.replace("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-[420px] mx-auto animate-fadeSlideUp">

      {/* ── Logo + heading ── */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-md mb-4"
          style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))" }}
        >
          <span className="font-sora font-black text-lg" style={{ color: "var(--color-bg)" }}>L</span>
        </div>
        <h1 className="font-sora font-black text-xl tracking-[-0.5px]" style={{ color: "var(--color-text)" }}>
          Welcome back
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>Sign in to continue your learning</p>
      </div>

      {/* ── Card ── */}
      <div
        className="rounded-lg p-7 border"
        style={{
          borderColor:           "var(--color-border)",
          background:            "rgba(11,34,57,0.75)",
          backdropFilter:        "blur(20px)",
          WebkitBackdropFilter:  "blur(20px)",
          boxShadow:             "0 8px 48px rgba(0,0,0,0.45)",
        }}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
              Email address
            </label>
            <Input
              type="email"
              inputSize="md"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                inputSize="md"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "var(--color-text-secondary)" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <span className="mt-px flex-shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting}
            className="mt-1"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Guest access */}
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center h-11 rounded-md",
            "text-sm font-medium",
            "border transition-all duration-normal",
          )}
          style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }}
        >
          Continue as guest
        </Link>
      </div>

      {/* Sign-up link */}
      <p className="text-center text-sm mt-5" style={{ color: "var(--color-text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium transition-colors"
          style={{ color: "var(--color-success)" }}
        >
          Sign up free
        </Link>
      </p>
    </div>
  );
}

// ─── Inline SVG icons (no external dep) ───────────────────────────────────────

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}
