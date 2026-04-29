"use client";

/**
 * /auth/email-change/undo — public landing page consumed by the
 * email-change notification link (Wave 2.10).
 *
 * The URL ?token=<JWT> is the credential. We POST it to the BE,
 * which verifies the signature, looks up email_changes by jti,
 * and reverts atomically. On success the user is told to log in
 * again — refresh tokens were revoked server-side.
 *
 * No auth header. No cookie reliance. The JWT is the auth.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getEmailChangeUndo } from "@/lib/api";
import Mascot from "@/components/ui/Mascot";

type Status = "loading" | "ok" | "error";

export default function EmailChangeUndoPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Liên kết không có token.");
      return;
    }
    let cancelled = false;
    getEmailChangeUndo(token)
      .then(() => { if (!cancelled) setStatus("ok"); })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Liên kết không còn hiệu lực.");
      });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="min-h-dvh flex items-center justify-center px-6"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
      <div className="w-full max-w-md flex flex-col items-center text-center gap-5">
        <Mascot size={96} mood={status === "ok" ? "happy" : status === "error" ? "sad" : "thinking"} />

        {status === "loading" && (
          <>
            <h1 className="text-xl font-display font-bold">Đang khôi phục email...</h1>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Vui lòng chờ trong giây lát.
            </p>
          </>
        )}

        {status === "ok" && (
          <>
            <h1 className="text-xl font-display font-bold" style={{ color: "#22C55E" }}>
              Đã khôi phục email
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Email tài khoản đã được khôi phục. Mọi phiên đăng nhập đã bị thoát vì lý do bảo mật.
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Vui lòng đăng nhập lại bằng email cũ. Nếu nghi ngờ tài khoản bị truy cập trái phép, đổi mật khẩu ngay sau khi vào.
            </p>
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #00A896, #00C4B0)", color: "#fff" }}
            >
              Đăng nhập lại
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-display font-bold" style={{ color: "#EF4444" }}>
              Liên kết không hợp lệ
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {error}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Liên kết có hiệu lực 7 ngày và chỉ dùng được một lần. Nếu cần hỗ trợ, liên hệ support@lingona.app.
            </p>
            <Link href="/login" className="text-sm font-semibold" style={{ color: "#00A896" }}>
              Về trang đăng nhập →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
