"use client";

/**
 * ChangePasswordModal — PR8b
 *
 * Two-mode form driven by the AuthUser.has_password flag shipped in backend
 * round 2:
 *   - has_password === true  → regular flow (current + new + confirm)
 *   - has_password === false → SSO flow (new + confirm only; no current pw)
 *
 * Errors are routed to the relevant inline field by `code` (never by message
 * text) so backend copy changes don't drift the UX. `role="alert"` +
 * aria-invalid + aria-describedby follow /fixing-accessibility guidance.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import { changePassword, ApiError } from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type FieldKey = "current_password" | "new_password" | "confirm_password" | "form";

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }: Props) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isSSO = user?.has_password !== true; // undefined → treat as SSO (safer default)

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Focus first field on open + ESC to close when idle.
  useEffect(() => {
    if (!isOpen) return;
    firstFieldRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, submitting]);

  if (!isOpen) return null;

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
    setSuccess(false);
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation — keeps simple cases off the wire.
    if (!newPassword) {
      setErrors({ new_password: "Thiếu mật khẩu mới" });
      return;
    }
    if (newPassword.length < 8) {
      setErrors({ new_password: "Mật khẩu mới phải có ít nhất 8 ký tự" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ confirm_password: "Mật khẩu nhập lại không khớp" });
      return;
    }
    if (!isSSO && !currentPassword) {
      setErrors({ current_password: "Vui lòng nhập mật khẩu hiện tại" });
      return;
    }

    setSubmitting(true);
    try {
      await changePassword({
        current_password: isSSO ? null : currentPassword,
        new_password: newPassword,
      });

      // Wave 1.3: backend revokes ALL refresh tokens + bumps password_version.
      // Local access token is now invalid; we must clear and redirect to /login
      // so the user re-authenticates from a clean slate.
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        reset();
        onClose();
        clearAuth();
        router.push("/login?reason=password_changed");
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        switch (err.code) {
          case "CURRENT_PASSWORD_WRONG":
            setErrors({ current_password: err.message });
            break;
          case "PASSWORD_TOO_SHORT":
          case "NEW_PASSWORD_REQUIRED":
            setErrors({ new_password: err.message });
            break;
          case "CURRENT_PASSWORD_REQUIRED":
          case "UNEXPECTED_CURRENT_PASSWORD":
            setErrors({ form: err.message });
            break;
          case "USER_NOT_FOUND":
            setErrors({ form: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại." });
            break;
          default:
            setErrors({ form: err.message || "Có lỗi xảy ra, vui lòng thử lại." });
        }
      } else {
        setErrors({ form: "Có lỗi xảy ra, vui lòng thử lại." });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title = isSSO ? "Đặt mật khẩu cho tài khoản" : "Đổi mật khẩu";
  const submitLabel = submitting
    ? "Đang xử lý…"
    : isSSO ? "Đặt mật khẩu" : "Đổi mật khẩu";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ background: "rgba(15,30,51,0.6)" }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div
        className="max-w-md w-full rounded-2xl p-6"
        style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="change-password-title"
          className="font-display font-bold mb-2"
          style={{ fontSize: 18, color: "var(--color-text)" }}
        >
          {title}
        </h3>

        {isSSO && !success && (
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            Tài khoản của bạn đang đăng nhập bằng Google. Đặt mật khẩu để có thể đăng nhập bằng email + mật khẩu lần sau.
          </p>
        )}

        {success ? (
          <div
            role="status"
            className="rounded-xl p-4 text-sm"
            style={{
              background: "rgba(29,158,117,0.12)",
              color: "var(--color-teal-accent)",
              border: "1px solid var(--color-border-teal)",
            }}
          >
            ✓ Mật khẩu đã được {isSSO ? "đặt" : "cập nhật"} thành công.
            <span style={{ display: "block", marginTop: 6, fontSize: 12, opacity: 0.8 }}>
              Đang chuyển sang trang đăng nhập…
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            {!isSSO && (
              <div>
                <label
                  htmlFor="cp-current"
                  className="block text-xs font-medium mb-1"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Mật khẩu hiện tại
                </label>
                <input
                  ref={firstFieldRef}
                  id="cp-current"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={submitting}
                  aria-invalid={!!errors.current_password}
                  aria-describedby={errors.current_password ? "cp-current-error" : undefined}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg-secondary)",
                    border: `1px solid ${errors.current_password ? "var(--color-amber)" : "var(--color-border)"}`,
                    color: "var(--color-text)",
                  }}
                />
                {errors.current_password && (
                  <p
                    id="cp-current-error"
                    role="alert"
                    className="text-xs mt-1"
                    style={{ color: "var(--color-amber)" }}
                  >
                    {errors.current_password}
                  </p>
                )}
              </div>
            )}

            <div>
              <label
                htmlFor="cp-new"
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Mật khẩu mới
              </label>
              <input
                ref={isSSO ? firstFieldRef : undefined}
                id="cp-new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.new_password}
                aria-describedby={errors.new_password ? "cp-new-error" : "cp-new-hint"}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: `1px solid ${errors.new_password ? "var(--color-amber)" : "var(--color-border)"}`,
                  color: "var(--color-text)",
                }}
              />
              {errors.new_password ? (
                <p
                  id="cp-new-error"
                  role="alert"
                  className="text-xs mt-1"
                  style={{ color: "var(--color-amber)" }}
                >
                  {errors.new_password}
                </p>
              ) : (
                <p id="cp-new-hint" className="text-xs mt-1" style={{ color: "var(--color-text-tertiary)" }}>
                  Tối thiểu 8 ký tự
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="cp-confirm"
                className="block text-xs font-medium mb-1"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Nhập lại mật khẩu mới
              </label>
              <input
                id="cp-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={submitting}
                aria-invalid={!!errors.confirm_password}
                aria-describedby={errors.confirm_password ? "cp-confirm-error" : undefined}
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{
                  background: "var(--color-bg-secondary)",
                  border: `1px solid ${errors.confirm_password ? "var(--color-amber)" : "var(--color-border)"}`,
                  color: "var(--color-text)",
                }}
              />
              {errors.confirm_password && (
                <p
                  id="cp-confirm-error"
                  role="alert"
                  className="text-xs mt-1"
                  style={{ color: "var(--color-amber)" }}
                >
                  {errors.confirm_password}
                </p>
              )}
            </div>

            {errors.form && (
              <p
                role="alert"
                className="text-xs rounded-lg p-3"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  color: "var(--color-amber)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}
              >
                {errors.form}
              </p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
                style={{
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                  background: "transparent",
                }}
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
                style={{ background: "var(--color-teal)", color: "#fff" }}
              >
                {submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
