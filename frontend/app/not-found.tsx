import Link from "next/link";
import Mascot from "@/components/ui/Mascot";

export default function NotFound() {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <Mascot size={120} />

      <h1 className="text-xl font-display font-bold">
        Trang này không tồn tại!
      </h1>

      <p className="text-sm max-w-xs" style={{ color: "var(--color-text-secondary)" }}>
        Để mình đưa bạn về trang chính nhé 🐙
      </p>

      <Link
        href="/home"
        className="px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all active:scale-95 cursor-pointer"
        style={{ background: "linear-gradient(135deg, #00A896, #00C4B0)" }}
      >
        Về trang chính
      </Link>
    </div>
  );
}
