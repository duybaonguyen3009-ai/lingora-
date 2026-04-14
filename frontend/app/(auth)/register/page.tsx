"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, migrateGuestProgress } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { getGuestUserId, clearGuestUserId } from "@/lib/guestUser";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Mascot from "@/components/ui/Mascot";

const selectCls = cn(
  "w-full h-11 px-4 rounded-md text-base",
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

    if (!email.trim()) { setError("Vui lòng nhập email.");                       return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Email không hợp lệ."); return;
    }
    if (password.length < 8) {
      setError("Mật khẩu cần ít nhất 8 ký tự."); return;
    }

    setSubmitting(true);
    try {
      await registerUser({
        name:     email.trim().split("@")[0],
        email:    email.trim().toLowerCase(),
        password,
        role,
      });

      const guestId = getGuestUserId();
      if (guestId) {
        await migrateGuestProgress(guestId).catch(() => {});
        clearGuestUserId();
      }

      analytics.signupComplete("email");
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
          Tạo tài khoản
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>Bắt đầu luyện IELTS miễn phí 🐙</p>
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

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
              Email
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
              Mật khẩu
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
            {submitting ? "Đang tạo..." : "Tạo tài khoản"}
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
          <span className="text-xs uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>hoặc</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        </div>

        {/* Google OAuth */}
        <a
          href="/api/v1/auth/google"
          className="flex items-center justify-center gap-3 w-full py-3 rounded-lg text-sm font-medium transition-all active:scale-[0.98] cursor-pointer"
          style={{
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Đăng ký bằng Google
        </a>
      </div>

      {/* Sign-in link */}
      <p className="text-center text-sm mt-5" style={{ color: "var(--color-text-secondary)" }}>
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-semibold transition-colors"
          style={{ color: "#00A896" }}
        >
          Đăng nhập
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
