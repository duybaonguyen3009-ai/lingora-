"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, migrateGuestProgress } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { getGuestUserId, clearGuestUserId } from "@/lib/guestUser";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Mascot from "@/components/ui/Mascot";

const selectCls = cn(
  "w-full h-11 px-4 rounded-md text-sm",
  "border outline-none",
  "transition duration-normal",
  "focus:ring-2 focus:ring-[#00A896]/20 focus:border-[#00A896]",
);

export default function RegisterPage() {
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const authReady = !useAuthStore((s) => s.isLoading);

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role,         setRole]         = useState<"kid" | "teacher" | "parent">("kid");
  const [error,        setError]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  useEffect(() => {
    if (authReady && user) router.replace("/");
  }, [authReady, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim())  { setError("Full name is required.");                  return; }
    if (!email.trim()) { setError("Email is required.");                       return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address."); return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password,
        role,
      });

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
    <div className="max-w-[440px] mx-auto animate-fadeSlideUp">

      {/* Logo + heading */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <Mascot size={64} />
        </div>
        <h1 className="font-display font-bold text-2xl tracking-[-0.5px]" style={{ color: "var(--color-text)" }}>
          Create your account
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>Start learning English today — it&apos;s free</p>
      </div>

      {/* Card */}
      <div
        className="rounded-xl p-7"
        style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        }}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

          {/* Full name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
              Full name
            </label>
            <Input
              type="text"
              inputSize="md"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emma Wilson"
            />
          </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
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
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs mt-0.5" style={{ color: "#F59E0B" }}>
                {8 - password.length} more character{8 - password.length !== 1 ? "s" : ""} needed
              </p>
            )}
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
              I am a...
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "kid" | "teacher" | "parent")}
              className={cn(selectCls, "cursor-pointer")}
              style={{
                color: "var(--color-text)",
                backgroundColor: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <option value="kid">Student</option>
              <option value="teacher">Teacher</option>
              <option value="parent">Parent</option>
            </select>
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
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </div>

      {/* Sign-in link */}
      <p className="text-center text-sm mt-5" style={{ color: "var(--color-text-secondary)" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: "#00A896" }}
        >
          Sign in
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
