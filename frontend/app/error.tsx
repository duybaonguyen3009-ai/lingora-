"use client";

import { useEffect } from "react";
import Link from "next/link";
import Mascot from "@/components/ui/Mascot";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[lingona] Unhandled error:", error);
  }, [error]);

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <Mascot size={120} />

      <h1 className="text-xl font-display font-bold">
        Ối, có lỗi xảy ra rồi!
      </h1>

      <p className="text-sm max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
        Đừng lo, Lintopus đang sửa! Bạn thử tải lại trang nhé 🐙
      </p>

      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95 cursor-pointer"
          style={{ background: "linear-gradient(135deg, #00A896, #00C4B0)" }}
        >
          Tải lại
        </button>
        <Link
          href="/home"
          className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 cursor-pointer"
          style={{
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          Về trang chính
        </Link>
      </div>
    </div>
  );
}
