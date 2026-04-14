"use client";

/**
 * NotificationBell.tsx — Bell icon with unread count badge + dropdown.
 *
 * Polls every 30s when user is logged in.
 * Dropdown shows recent notifications with type-specific messages.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Mascot from "@/components/ui/Mascot";
import { getSocialNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/authStore";
import type { SocialNotification } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000;

function formatNotification(n: SocialNotification): string {
  const data = n.data as Record<string, string>;
  switch (n.type) {
    case "friend_request":
      return `${data.senderName || "Someone"} sent you a friend request`;
    case "friend_accepted":
      return `${data.friendName || "Someone"} accepted your friend request`;
    case "accountability_ping":
      return `${data.senderName || "A friend"}: Ê hôm nay học chưa 👀`;
    default:
      return "New notification";
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getSocialNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silent
    }
  }, [user]);

  // Initial fetch + polling
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) fetchNotifications(); }}
        className="w-9 h-9 rounded-full flex items-center justify-center relative transition-all active:scale-95"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
        title="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-secondary)" }}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "#EF4444", color: "#fff", fontSize: "10px" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-12 w-80 max-h-96 overflow-y-auto rounded-xl shadow-lg z-50"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium"
                style={{ color: "#00A896" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
              <Mascot size={40} />
              <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>Chưa có thông báo nào</p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.read_at) handleMarkRead(n.id); }}
                  className="w-full text-left px-4 py-3 flex gap-3 transition-colors"
                  style={{
                    background: n.read_at ? "transparent" : "rgba(0,168,150,0.04)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {/* Unread dot */}
                  <div className="pt-1.5 shrink-0">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: n.read_at ? "transparent" : "#00A896" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug" style={{ color: "var(--color-text)" }}>
                      {formatNotification(n)}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
