"use client";

/**
 * app/(auth)/register/page.tsx  →  URL: /register
 *
 * New-account creation form.
 * Collects: name, email, password, role, date-of-birth (optional, for COPPA).
 * On success: calls registerUser() which updates the Zustand store,
 * then redirects to the dashboard at /.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerUser, migrateGuestProgress } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import { getGuestUserId, clearGuestUserId } from "@/lib/guestUser";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function minDateISO(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().split("T")[0];
}

// ─── Shared select style (Input component handles <input> elements) ───────────

const selectCls = cn(
  "w-full h-11 px-4 rounded-md text-sm",
  "border outline-none",
  "transition-all duration-normal",
  "[color-scheme:dark]",
);

const selectStyle: React.CSSProperties = {
  color: "var(--color-text)",
  backgroundColor: "var(--color-primary-soft)",
  borderColor: "var(--color-border)",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router    = useRouter();
  const user      = useAuthStore((s) => s.user);
  const authReady = !useAuthStore((s) => s.isLoading);

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role,         setRole]         = useState<"kid" | "teacher" | "parent">("kid");
  const [dob,          setDob]          = useState("");
  const [error,        setError]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  // Already authenticated → go home
  useEffect(() => {
    if (authReady && user) router.replace("/");
  }, [authReady, user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
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
      const result = await registerUser({
        name:     name.trim(),
        email:    email.trim().toLowerCase(),
        password,
        role,
        ...(dob ? { dob } : {}),
      });

      // COPPA: under-13 account created but parental consent needed (Task 7)
      if (result.needsParentalConsent) {
        // TODO (Task 7): redirect to "/consent-pending" page
        console.info("[COPPA] Parental consent required for:", result.user.email);
      }

      // Migrate any progress accumulated as a guest into the new account.
      // Non-critical: swallow errors so a migration hiccup never blocks registration.
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

      {/* ── Logo + heading ── */}
      <div className="text-center mb-8">
        <div
          className="inline-flex items-center justify-center w-12 h-12 rounded-md mb-4"
          style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))" }}
        >
          <span className="font-sora font-black text-lg" style={{ color: "var(--color-bg)" }}>L</span>
        </div>
        <h1 className="font-sora font-black text-xl tracking-[-0.5px]" style={{ color: "var(--color-text)" }}>
          Create your account
        </h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--color-text-secondary)" }}>Start learning English today — it&apos;s free</p>
      </div>

      {/* ── Card ── */}
      <div
        className="rounded-lg p-7 border"
        style={{
          borderColor:          "var(--color-border)",
          background:           "rgba(11,34,57,0.75)",
          backdropFilter:       "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow:            "0 8px 48px rgba(0,0,0,0.45)",
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
            {/* Inline strength hint */}
            {password.length > 0 && password.length < 8 && (
              <p className="text-xs text-amber-400/80 mt-0.5">
                {8 - password.length} more character{8 - password.length !== 1 ? "s" : ""} needed
              </p>
            )}
          </div>

          {/* Role + Date of birth — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
                I am a…
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "kid" | "teacher" | "parent")}
                className={cn(selectCls, "cursor-pointer")}
                style={selectStyle}
              >
                <option value="kid">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium tracking-[0.2px]" style={{ color: "var(--color-text-secondary)" }}>
                Date of birth
              </label>
              <Input
                type="date"
                inputSize="md"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={todayISO()}
                min={minDateISO()}
                className="cursor-pointer"
              />
            </div>
          </div>

          {/* COPPA notice */}
          <p className="text-xs leading-[1.6]" style={{ color: "var(--color-text-secondary)" }}>
            Date of birth is used for COPPA age verification. Accounts for users
            under 13 require a parent or guardian&apos;s email consent before activation.
          </p>

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
            {submitting ? "Creating account…" : "Create Account"}
          </Button>
        </form>
      </div>

      {/* Sign-in link */}
      <p className="text-center text-sm mt-5" style={{ color: "var(--color-text-secondary)" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium transition-colors"
          style={{ color: "var(--color-success)" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────

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
