"use client";

/**
 * SettingsScreen.tsx — Account settings, logout, theme, notifications.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/stores/authStore";
import { logoutUser } from "@/lib/api";

export default function SettingsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState(true);

  // Change password form
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutUser();
    router.push("/login");
  }

  function handleChangePassword() {
    // Backend doesn't have change-password endpoint yet
    setPasswordMsg({ text: "Password change is coming soon.", ok: false });
    setCurrentPassword("");
    setNewPassword("");
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div>
        <h2 className="text-2xl font-display font-bold" style={{ color: "var(--color-text)" }}>
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Manage your account and preferences
        </p>
      </div>

      {/* ── Account ── */}
      <section>
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
          Account
        </div>
        <div
          className="rounded-xl"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--color-border)" }}
        >
          {/* Display name */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Name</div>
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{user?.name || "—"}</div>
            </div>
          </div>

          {/* Email (read-only) */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Email</div>
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{user?.email || "—"}</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--surface-subtle)", color: "var(--color-text-tertiary)" }}>
              Read-only
            </span>
          </div>

          {/* Change password */}
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Password</div>
              <button
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-xs font-medium cursor-pointer"
                style={{ color: "#00A896" }}
              >
                {showPasswordForm ? "Cancel" : "Change"}
              </button>
            </div>

            {showPasswordForm && (
              <div className="mt-3 flex flex-col gap-2.5">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full rounded-lg px-3 py-2.5 text-sm"
                  style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                />
                <button
                  onClick={handleChangePassword}
                  disabled={!currentPassword || !newPassword}
                  className="self-end px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  style={{ background: "#00A896", color: "#fff" }}
                >
                  Update Password
                </button>
                {passwordMsg && (
                  <p className="text-xs" style={{ color: passwordMsg.ok ? "#22C55E" : "var(--color-text-tertiary)" }}>
                    {passwordMsg.text}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Preferences ── */}
      <section>
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
          Preferences
        </div>
        <div
          className="rounded-xl"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--color-border)" }}
        >
          {/* Theme */}
          <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Theme</div>
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </div>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: theme === "dark" ? "#00A896" : "var(--color-border)",
              }}
              aria-label="Toggle theme"
            >
              <span
                className="absolute top-0.5 w-6 h-6 rounded-full transition-transform"
                style={{
                  backgroundColor: "#fff",
                  transform: theme === "dark" ? "translateX(22px)" : "translateX(2px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Notifications</div>
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                Friend pings, badges, streaks
              </div>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className="relative w-12 h-7 rounded-full transition-colors cursor-pointer shrink-0"
              style={{
                backgroundColor: notifications ? "#00A896" : "var(--color-border)",
              }}
              aria-label="Toggle notifications"
            >
              <span
                className="absolute top-0.5 w-6 h-6 rounded-full transition-transform"
                style={{
                  backgroundColor: "#fff",
                  transform: notifications ? "translateX(22px)" : "translateX(2px)",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── Danger Zone ── */}
      <section>
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
          Session
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "#EF4444",
            border: "1px solid rgba(239,68,68,0.2)",
            opacity: loggingOut ? 0.6 : 1,
          }}
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </section>

      {/* Version info */}
      <p className="text-[10px] text-center" style={{ color: "var(--color-text-tertiary)" }}>
        Lingona v0.1.0
      </p>
    </div>
  );
}
