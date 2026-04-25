"use client";

/**
 * /settings — 5-section settings page (PR6).
 *
 * Sections: Account, Gói Pro, Mục tiêu học, Thông báo, Giao diện.
 *
 * Backend wiring status:
 *   - Subscription tier/expiry/auto-renew endpoint: NOT AVAILABLE
 *     (api.ts only exposes startProTrial + upgradeToPro). Pro card therefore
 *     shows generic "Bạn đang có Pro" state; specific tier and expiry are
 *     rendered as "—" with a TODO when the endpoint lands.
 *   - Change email / change password: endpoint NOT AVAILABLE — buttons open
 *     a modal that directs users to the support email.
 *   - Learning + Notifications preferences: no backend endpoint — persisted
 *     to localStorage with TODO markers for wiring later.
 *   - i18n: no library installed → language chip is visually disabled.
 *   - Billing history + refund + promo code: no endpoint → buttons toast
 *     "Tính năng đang hoàn thiện".
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  logoutUser,
  getSubscription,
  toggleAutoRenew,
  getPreferences,
  updatePreferences,
} from "@/lib/api";
import { useDailyLimits } from "@/hooks/useDailyLimits";
import AnimatedBackground from "@/components/AnimatedBackground";
import Topbar from "@/components/Topbar";
import Toggle from "@/components/ui/Toggle";
import ProUpgradeModal from "@/components/Pro/ProUpgradeModal";
import ChangePasswordModal from "@/components/Settings/ChangePasswordModal";
import { useAppData } from "@/contexts/AppDataContext";
import type { UserSubscription, UserPreferences } from "@/lib/types";

// PR8a — promo code redemption endpoint returns 501 pre-launch; hide UI entirely.
const PROMO_ENABLED = false;

type SectionId = "account" | "subscription" | "learning" | "notifications" | "appearance";

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "account",       label: "Tài khoản",      icon: "👤" },
  { id: "subscription",  label: "Gói Pro",        icon: "⭐" },
  { id: "learning",      label: "Mục tiêu học",   icon: "🎯" },
  { id: "notifications", label: "Thông báo",      icon: "🔔" },
  { id: "appearance",    label: "Giao diện",      icon: "🎨" },
];

const SUPPORT_EMAIL = "baolux0904@gmail.com";

function useHashSection(): [SectionId, (s: SectionId) => void] {
  const [section, setSection] = useState<SectionId>("account");

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.replace("#", "");
      if (SECTIONS.some((s) => s.id === hash)) setSection(hash as SectionId);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const navigate = (s: SectionId) => {
    window.location.hash = s;
    setSection(s);
  };
  return [section, navigate];
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return mobile;
}

// ─── Font size apply (Appearance) ──────────────────────────────────────────
type FontSize = "sm" | "md" | "lg";
const FONT_SIZE_KEY = "lingona.settings.fontsize";
const FONT_SIZE_PX: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" };

function useFontSize(): [FontSize, (s: FontSize) => void] {
  const [size, setSize] = useState<FontSize>("md");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem(FONT_SIZE_KEY)) as FontSize | null;
    if (stored && FONT_SIZE_PX[stored]) setSize(stored);
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.fontSize = FONT_SIZE_PX[size];
  }, [size]);
  const update = (s: FontSize) => {
    setSize(s);
    try { window.localStorage.setItem(FONT_SIZE_KEY, s); } catch {}
  };
  return [size, update];
}

// ─── User preferences — PR8a backend-backed with localStorage cache ────────
// Merged hook covers both learning (target_band / exam_date / daily_xp_goal)
// and notifications (streak_reminder / push / battle_invite / email) since
// the backend stores them in a single JSONB blob at /users/preferences.
//
// Cache: read localStorage for instant paint, then reconcile with the
// authoritative server payload on mount. Writes are optimistic with
// rollback if the PATCH fails (e.g. 400 on out-of-range values).
const PREFS_CACHE_KEY = "lingona.settings.preferences";

const DEFAULT_PREFS: UserPreferences = {
  target_band: 6.5,
  exam_date: null,
  daily_xp_goal: 50,
  notifications: {
    push: true,
    email: false,
    streak_reminder: true,
    battle_invite: true,
  },
};

function mergePrefs(base: UserPreferences, patch: UserPreferences): UserPreferences {
  return {
    ...base,
    ...patch,
    notifications: {
      ...(base.notifications ?? {}),
      ...(patch.notifications ?? {}),
    },
  };
}

function usePrefs() {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from localStorage cache for instant paint.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_CACHE_KEY);
      if (raw) setPrefs((prev) => mergePrefs(prev, JSON.parse(raw)));
    } catch {}
  }, []);

  // Reconcile with server (authoritative).
  useEffect(() => {
    let cancelled = false;
    getPreferences()
      .then((remote) => {
        if (cancelled || !remote) return;
        const merged = mergePrefs(DEFAULT_PREFS, remote);
        setPrefs(merged);
        try { window.localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(merged)); } catch {}
      })
      .catch(() => { /* silent — keep cached/default */ });
    return () => { cancelled = true; };
  }, []);

  const update = async (patch: UserPreferences) => {
    setError(null);
    const previous = prefs;
    const optimistic = mergePrefs(previous, patch);
    setPrefs(optimistic);
    try { window.localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(optimistic)); } catch {}

    try {
      const confirmed = await updatePreferences(patch);
      const merged = mergePrefs(DEFAULT_PREFS, confirmed);
      setPrefs(merged);
      try { window.localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(merged)); } catch {}
    } catch (err) {
      // Rollback — keep localStorage consistent with UI state.
      setPrefs(previous);
      try { window.localStorage.setItem(PREFS_CACHE_KEY, JSON.stringify(previous)); } catch {}
      setError(err instanceof Error ? err.message : "Không lưu được thay đổi, vui lòng thử lại.");
    }
  };

  return { prefs, update, error, clearError: () => setError(null) };
}

// ─── Subscription — PR8a /users/subscription GET + toggle-renew POST ───────
function useSubscription() {
  const [sub, setSub] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSubscription()
      .then((data) => { if (!cancelled) setSub(data); })
      .catch(() => { /* silent — UI degrades to placeholder */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleRenew = async () => {
    const previous = sub;
    // Optimistic — flip auto_renew locally, rollback on failure.
    if (sub) setSub({ ...sub, auto_renew: !sub.auto_renew });
    try {
      const confirmed = await toggleAutoRenew();
      setSub(confirmed);
      return { ok: true as const };
    } catch (err) {
      setSub(previous);
      return { ok: false as const, message: err instanceof Error ? err.message : "Không đổi được thiết lập." };
    }
  };

  return { sub, loading, toggleRenew };
}

function formatVnDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const ms = d.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
}

// ─── Info modal (generic "coming soon" + support contact) ──────────────────
function InfoModal({ open, title, body, onClose }: { open: boolean; title: string; body: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: "rgba(15,30,51,0.6)" }} onClick={onClose}>
      <div className="max-w-md w-full rounded-2xl p-6" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display font-bold mb-2" style={{ fontSize: 18, color: "var(--color-text)" }}>{title}</h3>
        <p className="text-sm whitespace-pre-line" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{body}</p>
        <button type="button" onClick={onClose} className="mt-5 w-full px-4 py-2.5 rounded-full text-sm font-semibold" style={{ background: "var(--color-teal)", color: "#fff" }}>
          Đã hiểu
        </button>
      </div>
    </div>
  );
}

// ─── Row primitive ─────────────────────────────────────────────────────────
function Row({ label, value, children }: { label: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between py-3.5 gap-4"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <div className="min-w-0">
        <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</div>
        {value && <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{value}</div>}
      </div>
      {children}
    </div>
  );
}

function ChipGroup<T extends string | number>({ options, value, onChange, disabled }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: active ? "var(--color-teal)" : "var(--color-bg-secondary)",
              color: active ? "#fff" : "var(--color-text-secondary)",
              border: active ? "none" : "1px solid var(--color-border)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="font-display font-bold" style={{ fontSize: 22, color: "var(--color-text)" }}>{title}</h2>
      {sub && <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{sub}</p>}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const { isPro } = useDailyLimits();
  const { displayStreak } = useAppData();
  const [section, setSection] = useHashSection();
  const isMobile = useIsMobile();
  const [fontSize, setFontSize] = useFontSize();
  const { prefs, update: updatePrefs } = usePrefs();
  const { sub, toggleRenew: runToggleRenew } = useSubscription();
  const [showPro, setShowPro] = useState(false);
  const [info, setInfo] = useState<{ title: string; body: string } | null>(null);
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // PR8a — derived prefs + notification helpers (replaces old learning/notif split).
  const targetBand = prefs.target_band ?? 6.5;
  const examDate = prefs.exam_date ?? "";
  const dailyXp = prefs.daily_xp_goal ?? 50;
  const notifs = prefs.notifications ?? {};
  const updateNotif = (key: "push" | "email" | "streak_reminder" | "battle_invite", value: boolean) =>
    updatePrefs({ notifications: { ...notifs, [key]: value } });

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutUser();
    router.push("/login");
  };

  const openSupportInfo = (title: string, body: string) =>
    setInfo({
      title,
      body: `${body}\n\nLiên hệ hỗ trợ: ${SUPPORT_EMAIL}`,
    });

  // Exam countdown — uses the backend-backed exam_date from prefs.
  const daysToExam = daysUntil(examDate || null);

  // ─── Section content ─────────────────────────────────────────────────────
  const AccountSection = (
    <div>
      <SectionHeader title="Tài khoản" sub="Thông tin cá nhân và đăng nhập" />
      <div>
        <Row label="Tên hiển thị" value={user?.name || "—"}>
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
          >
            Chỉnh sửa
          </button>
        </Row>
        <Row label="Email" value={user?.email || "—"}>
          <button
            type="button"
            onClick={() => openSupportInfo("Đổi email", "Đổi email đang hoàn thiện. Hiện tại mày liên hệ hỗ trợ để xử lý thủ công.")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
          >
            Đổi email
          </button>
        </Row>
        <Row
          label="Mật khẩu"
          value={user?.has_password === true
            ? "Đổi mật khẩu để bảo mật tài khoản"
            : "Đặt mật khẩu để đăng nhập bằng email + mật khẩu"}
        >
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
          >
            {user?.has_password === true ? "Đổi mật khẩu" : "Đặt mật khẩu"}
          </button>
        </Row>
        <Row label="Giới thiệu (bio)" value="Cập nhật qua trang Hồ sơ">
          <button
            type="button"
            onClick={() => router.push("/profile")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
          >
            Chỉnh sửa
          </button>
        </Row>
      </div>
      <div className="mt-6">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full px-4 py-2.5 rounded-full text-sm font-semibold disabled:opacity-60"
          style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          {loggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
        </button>
      </div>
    </div>
  );

  // PR8a — subscription state drives what we render. Prefer server payload;
  // fall back to useDailyLimits().isPro only when the detail endpoint hasn't
  // returned yet (keeps the pre-launch monetisation gate visible on slow nets).
  const subTier = sub?.tier ?? (isPro ? "pro" : "free");

  const SubscriptionSection = (
    <div>
      <SectionHeader title="Gói Pro" sub="Trạng thái và quản lý đăng ký" />

      {subTier === "pro" && sub && (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, var(--color-bg-navy), var(--color-bg-teal-surface))",
            border: "1px solid var(--color-border-teal)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "var(--color-amber)", color: "var(--color-bg-navy)" }}
            >
              PRO
            </span>
            <span style={{ color: "#F7F4EC", fontSize: 14, fontWeight: 600 }}>Bạn đang có Pro</span>
          </div>
          <div className="text-sm mb-1" style={{ color: "rgba(247,244,236,0.72)", lineHeight: 1.55 }}>
            {sub.auto_renew
              ? `Tự động gia hạn: ${formatVnDate(sub.next_billing_date)}`
              : `Hết hạn: ${formatVnDate(sub.subscription_expires_at)}`}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowPro(true)}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: "var(--color-teal)", color: "#fff" }}
            >
              Nâng cấp gói dài hơn
            </button>
            <button
              type="button"
              onClick={() => setConfirmRenew(true)}
              className="px-4 py-2 rounded-full text-xs font-semibold"
              style={{ color: "#F7F4EC", border: "1px solid rgba(247,244,236,0.3)", background: "transparent" }}
            >
              {sub.auto_renew ? "Tắt tự động gia hạn" : "Bật lại tự động gia hạn"}
            </button>
          </div>
        </div>
      )}

      {subTier === "trial" && sub && (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{
            background: "linear-gradient(135deg, var(--color-bg-navy), var(--color-bg-teal-surface))",
            border: "1px solid var(--color-border-teal)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "var(--color-amber)", color: "var(--color-bg-navy)" }}
            >
              TRIAL
            </span>
            <span style={{ color: "#F7F4EC", fontSize: 14, fontWeight: 600 }}>
              {daysUntil(sub.trial_expires_at) != null
                ? `Còn ${daysUntil(sub.trial_expires_at)} ngày dùng thử`
                : "Đang dùng thử Pro"}
            </span>
          </div>
          <div className="text-sm mb-3" style={{ color: "rgba(247,244,236,0.72)", lineHeight: 1.55 }}>
            Hết hạn: {formatVnDate(sub.trial_expires_at)}. Nâng cấp để giữ quyền lợi không giới hạn.
          </div>
          <button
            type="button"
            onClick={() => setShowPro(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold"
            style={{ background: "var(--color-teal)", color: "#fff" }}
          >
            Nâng cấp Pro
          </button>
        </div>
      )}

      {subTier === "free" && (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <h3 className="font-display font-bold mb-2" style={{ fontSize: 18, color: "var(--color-text)" }}>
            Nâng cấp lên Pro
          </h3>
          <ul className="text-sm space-y-1.5 mb-4" style={{ color: "var(--color-text-secondary)" }}>
            <li>• Speaking AI không giới hạn</li>
            <li>• Writing AI không giới hạn</li>
            <li>• Full Test mode tất cả 4 skill</li>
            <li>• Feedback chi tiết theo 4 tiêu chí IELTS</li>
          </ul>
          <button
            type="button"
            onClick={() => setShowPro(true)}
            className="px-4 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "var(--color-teal)", color: "#fff" }}
          >
            Xem gói Pro
          </button>
        </div>
      )}

      <div>
        <Row label="Lịch sử thanh toán" value="Xem các giao dịch đã thực hiện">
          <button
            type="button"
            onClick={() => openSupportInfo("Lịch sử thanh toán", "Tính năng đang hoàn thiện.")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
          >
            Xem
          </button>
        </Row>
        {/* PR8a — promo code endpoint returns 501 pre-launch; hide the row
            entirely until `PROMO_ENABLED` flips (post 2026-05-15). */}
        {PROMO_ENABLED && (
          <Row label="Mã khuyến mãi" value="Nhập mã giảm giá cho lần nâng cấp kế tiếp">
            <button
              type="button"
              onClick={() => openSupportInfo("Mã khuyến mãi", "Tính năng đang hoàn thiện.")}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
            >
              Nhập mã
            </button>
          </Row>
        )}
        <Row label="Yêu cầu hoàn tiền" value="Gửi yêu cầu qua email hỗ trợ">
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Yêu cầu hoàn tiền Lingona")}`}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ color: "var(--color-teal-accent)", border: "1px solid var(--color-border-teal)" }}
          >
            Gửi yêu cầu
          </a>
        </Row>
      </div>
    </div>
  );

  const LearningSection = (
    <div>
      <SectionHeader title="Mục tiêu học" sub="Thiết lập mục tiêu để AI Study Coach gợi ý đúng lộ trình" />
      <Row label="Band mục tiêu" value={`Hiện tại: ${targetBand.toFixed(1)}`}>
        <div className="w-full mt-2 md:w-auto md:mt-0">
          <ChipGroup
            options={[5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0].map((b) => ({ value: b, label: b.toFixed(1) }))}
            value={targetBand}
            onChange={(v) => updatePrefs({ target_band: v })}
          />
        </div>
      </Row>
      <Row label="Ngày thi dự kiến" value={daysToExam != null ? `Còn ~${daysToExam} ngày` : "Chưa đặt ngày thi"}>
        <input
          type="date"
          value={examDate}
          onChange={(e) => updatePrefs({ exam_date: e.target.value || null })}
          className="rounded-lg px-3 py-1.5 text-xs"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
        />
      </Row>
      <Row label="Mục tiêu XP / ngày" value={`Khoảng ${Math.round(dailyXp * 1.2)} phút / ngày`}>
        <div className="w-full mt-2 md:w-auto md:mt-0">
          <ChipGroup
            options={[30, 50, 100, 200].map((xp) => ({ value: xp, label: `${xp} XP` }))}
            value={dailyXp}
            onChange={(v) => updatePrefs({ daily_xp_goal: v })}
          />
        </div>
      </Row>
    </div>
  );

  // PR8a — Notifications now reflect the backend whitelist 1:1:
  //   streak_reminder · push · battle_invite · email.
  // Dropped PR6 labels "Lời mời kết bạn" and "Nhắc mục tiêu hàng ngày" (no
  // matching server keys — keeping them localStorage-only would leak broken
  // toggles once the UI looked wired).
  const NotificationsSection = (
    <div>
      <SectionHeader title="Thông báo" sub="Chọn loại thông báo bạn muốn nhận" />
      <Row label="Nhắc giữ streak" value="Nhận nhắc khi streak sắp mất">
        <Toggle checked={notifs.streak_reminder ?? true} onChange={(v) => updateNotif("streak_reminder", v)} aria-label="Nhắc giữ streak" />
      </Row>
      <Row label="Push notifications" value="Nhắc học, kết quả chấm, sự kiện">
        <Toggle checked={notifs.push ?? true} onChange={(v) => updateNotif("push", v)} aria-label="Push notifications" />
      </Row>
      <Row label="Lời mời thách đấu Battle" value="Nhận khi có trận Battle mới">
        <Toggle checked={notifs.battle_invite ?? true} onChange={(v) => updateNotif("battle_invite", v)} aria-label="Lời mời thách đấu Battle" />
      </Row>
      <Row label="Email newsletter" value="Tin tức + mẹo học hàng tuần">
        <Toggle checked={notifs.email ?? false} onChange={(v) => updateNotif("email", v)} aria-label="Email newsletter" />
      </Row>
    </div>
  );

  const AppearanceSection = (
    <div>
      <SectionHeader title="Giao diện" sub="Tùy chỉnh chủ đề và kích thước chữ" />
      <Row label="Chủ đề" value={`Đang dùng: ${theme === "system" ? "Theo hệ thống" : theme === "dark" ? "Tối" : "Sáng"}`}>
        <ChipGroup
          options={[
            { value: "light", label: "Sáng" },
            { value: "dark", label: "Tối" },
            { value: "system", label: "Hệ thống" },
          ]}
          value={(theme as "light" | "dark" | "system") ?? "system"}
          onChange={(v) => setTheme(v)}
        />
      </Row>
      <Row label="Ngôn ngữ" value="Tính năng i18n đang phát triển">
        <ChipGroup
          options={[
            { value: "vi", label: "Tiếng Việt" },
            { value: "en", label: "English" },
          ]}
          value="vi"
          onChange={() => {}}
          disabled
        />
      </Row>
      <Row label="Cỡ chữ" value={`Đang dùng: ${fontSize === "sm" ? "Nhỏ" : fontSize === "lg" ? "Lớn" : "Vừa"}`}>
        <ChipGroup
          options={[
            { value: "sm" as const, label: "Nhỏ" },
            { value: "md" as const, label: "Vừa" },
            { value: "lg" as const, label: "Lớn" },
          ]}
          value={fontSize}
          onChange={setFontSize}
        />
      </Row>
    </div>
  );

  const SECTION_CONTENT: Record<SectionId, React.ReactNode> = {
    account: AccountSection,
    subscription: SubscriptionSection,
    learning: LearningSection,
    notifications: NotificationsSection,
    appearance: AppearanceSection,
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  const showContent = !isMobile || section !== ((typeof window !== "undefined" && window.location.hash.replace("#", "")) as SectionId || "account") || true;
  // On mobile we render nav when no hash is set (landing), otherwise content.
  const mobileViewingSection = isMobile && (typeof window !== "undefined" && window.location.hash !== "");

  const Nav = (
    <nav className="flex flex-col gap-1">
      {SECTIONS.map((s) => {
        const active = s.id === section;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-colors"
            style={{
              background: active ? "rgba(29,158,117,0.15)" : "transparent",
              color: active ? "var(--color-teal-accent)" : "var(--color-text-secondary)",
            }}
          >
            <span aria-hidden>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh relative">
      <AnimatedBackground variant="subtle" />
      <div className="lg:hidden"><Topbar streak={displayStreak} /></div>
      <div className="mx-auto px-5 py-6 max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium mb-5">
          <button
            type="button"
            onClick={() => (isMobile && mobileViewingSection ? (window.location.hash = "", setSection("account")) : router.push("/profile"))}
            className="flex items-center gap-1"
            style={{ color: "var(--color-teal-accent)" }}
          >
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            {isMobile && mobileViewingSection ? "Quay lại" : "Hồ sơ"}
          </button>
          {!isMobile && (
            <>
              <span style={{ color: "var(--color-text-tertiary)" }}>›</span>
              <span style={{ color: "var(--color-text-tertiary)" }}>Cài đặt</span>
            </>
          )}
        </nav>

        <h1 className="font-display font-bold tracking-tight mb-6" style={{ fontSize: 28, color: "var(--color-text)" }}>
          Cài đặt
        </h1>

        {isMobile ? (
          mobileViewingSection ? SECTION_CONTENT[section] : Nav
        ) : (
          <div className="grid gap-8" style={{ gridTemplateColumns: "200px 1fr" }}>
            <aside className="sticky top-4">{Nav}</aside>
            <div>{SECTION_CONTENT[section]}</div>
          </div>
        )}
      </div>

      <ProUpgradeModal isOpen={showPro} onClose={() => setShowPro(false)} onUpgraded={() => setShowPro(false)} />
      <ChangePasswordModal isOpen={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <InfoModal open={!!info} title={info?.title ?? ""} body={info?.body ?? ""} onClose={() => setInfo(null)} />

      {/* PR8a — confirm auto-renew toggle. Wording flips based on current state. */}
      {confirmRenew && sub && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(15,30,51,0.6)" }}
          onClick={() => setConfirmRenew(false)}
        >
          <div
            className="max-w-md w-full rounded-2xl p-6"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold mb-2" style={{ fontSize: 18, color: "var(--color-text)" }}>
              {sub.auto_renew ? "Tắt tự động gia hạn?" : "Bật lại tự động gia hạn?"}
            </h3>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {sub.auto_renew
                ? `Sau khi tắt, gói Pro sẽ hết hạn vào ${formatVnDate(sub.subscription_expires_at)}. Bạn vẫn giữ Pro đến ngày đó.`
                : `Bật lại để tự động tiếp tục Pro từ ${formatVnDate(sub.next_billing_date ?? sub.subscription_expires_at)}.`}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmRenew(false)}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ color: "var(--color-text)", border: "1px solid var(--color-border)", background: "transparent" }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await runToggleRenew();
                  setConfirmRenew(false);
                  if (!result.ok) {
                    setInfo({ title: "Không đổi được thiết lập", body: result.message });
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-full text-sm font-semibold"
                style={{ background: "var(--color-teal)", color: "#fff" }}
              >
                {sub.auto_renew ? "Tắt" : "Bật"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
