"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUser, migrateGuestProgress } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { getGuestUserId, clearGuestUserId } from "@/lib/guestUser";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Mascot from "@/components/ui/Mascot";

export default function LoginPage() {
  const router     = useRouter();
  const user       = useAuthStore((s) => s.user);
  const authReady  = !useAuthStore((s) => s.isLoading);

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

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

      {/* Logo + heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <Mascot size={64} />
        </div>
        <h1 className="font-display font-bold text-2xl tracking-[-0.5px]" style={{ color: "var(--color-text)" }}>
          Welcome back
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>Sign in to continue your learning</p>
      </div>

      {/* Card — clean white, shadow-lg */}
      <div
        className="rounded-xl p-7"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
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
                placeholder="Enter your password"
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
            <div
              className="flex items-start gap-2 px-3.5 py-2.5 rounded-md text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.15)",
                color: "#EF4444",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
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
            style={{
              boxShadow: "0 4px 16px rgba(0,168,150,0.25)",
            }}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>or</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Guest access */}
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center h-11 rounded-full",
            "text-sm font-medium",
            "border transition duration-normal hover:shadow-sm",
          )}
          style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}
        >
          Continue as guest
        </Link>
      </div>

      {/* Sign-up link */}
      <p className="text-center text-sm mt-5" style={{ color: "var(--color-text-secondary)" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold transition-colors"
          style={{ color: "#00A896" }}
        >
          Sign up free
        </Link>
      </p>
    </div>
  );
}

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
