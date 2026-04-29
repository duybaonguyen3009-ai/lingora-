"use client";

/**
 * ChangeEmailModal.tsx — single-step email change (Wave 2.10).
 *
 * Inputs: new email + current password (re-auth).
 * Submit → POST /auth/email-change → on 200, parent fires logoutUser
 * (best-effort; the BE has already revoked the refresh token + bumped
 * password_version) + router.push("/login?email_changed=1").
 *
 * Generic-error rule: server returns "Email không khả dụng" for both
 * collisions and validation failures, deliberately. We surface that
 * verbatim — no client-side speculation about why.
 */

import { useState, useEffect, useCallback } from "react";
import { changeEmail } from "@/lib/api";

interface ChangeEmailModalProps {
  isOpen: boolean;
  currentEmail: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export default function ChangeEmailModal({ isOpen, currentEmail, onClose, onChanged }: ChangeEmailModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewEmail("");
      setPassword("");
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const canSubmit =
    newEmail.length > 0 &&
    newEmail.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail) &&
    password.length > 0 &&
    !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await changeEmail(newEmail.trim(), password);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đổi email. Thử lại sau.");
      setSubmitting(false);
    }
  }, [canSubmit, newEmail, password, onChanged]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-display font-bold" style={{ color: "var(--color-text)" }}>
          Đổi email tài khoản
        </h2>

        {currentEmail && (
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Email hiện tại: <strong style={{ color: "var(--color-text)" }}>{currentEmail}</strong>
          </p>
        )}

        <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
          Email xác nhận sẽ gửi tới địa chỉ cũ với liên kết hủy đổi (có hiệu lực 7 ngày).
          Mọi phiên đăng nhập sẽ bị thoát; bạn cần đăng nhập lại với email mới.
        </p>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Email mới</span>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setError(null); }}
            autoComplete="off"
            spellCheck={false}
            className="w-full py-3 px-4 rounded-lg text-sm"
            style={{
              background: "var(--surface-secondary)",
              color: "var(--color-text)",
              border: "1px solid var(--surface-border)",
              outline: "none",
            }}
            placeholder="new@example.com"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>Mật khẩu hiện tại</span>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            autoComplete="current-password"
            className="w-full py-3 px-4 rounded-lg text-sm"
            style={{
              background: "var(--surface-secondary)",
              color: "var(--color-text)",
              border: "1px solid var(--surface-border)",
              outline: "none",
            }}
          />
        </label>

        {error && (
          <p className="text-xs" style={{ color: "#EF4444" }}>{error}</p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: "var(--surface-secondary)", color: "var(--color-text)", border: "1px solid var(--surface-border)" }}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: canSubmit ? "linear-gradient(135deg, #00A896, #00C4B0)" : "rgba(0,168,150,0.3)",
              color: "#fff",
            }}
          >
            {submitting ? "Đang đổi..." : "Đổi email"}
          </button>
        </div>
      </div>
    </div>
  );
}
