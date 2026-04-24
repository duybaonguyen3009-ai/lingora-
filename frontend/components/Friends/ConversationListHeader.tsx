"use client";

/**
 * ConversationListHeader — PR7.1
 *
 * Top row above the Friends content area: title + kebab menu that replaces
 * the old horizontal Chat/Friends/Requests/Add/Rooms tab bar.
 *
 * Kebab menu routes to dedicated pages (/friends/add, /friends/requests,
 * /friends/rooms) and exposes a "Mời bạn qua link" share action.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getIncomingRequests } from "@/lib/api";

// Initial fetch reference — keeps the call site typed without drifting if the
// envelope shape changes (the hook returns { requests: FriendRequest[] }).

type MenuItem = {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
  danger?: boolean;
};

function IconUserPlus() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function IconUserCheck() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}
function IconDoor() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14" />
      <line x1="4" y1="20" x2="20" y2="20" />
      <circle cx="14" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}
function IconShare() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
function IconKebab() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export default function ConversationListHeader() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Request count — best-effort; hide badge on error or 0.
  useEffect(() => {
    let cancelled = false;
    getIncomingRequests()
      .then((res) => {
        if (cancelled) return;
        const count = Array.isArray(res?.requests) ? res.requests.length : 0;
        setRequestCount(count);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  const handleShare = async () => {
    setOpen(false);
    const url = typeof window !== "undefined" ? window.location.origin : "https://lingona.app";
    const text = "Cùng luyện IELTS với mình trên Lingona nhé!";
    try {
      if (typeof navigator !== "undefined" && (navigator as Navigator).share) {
        await (navigator as Navigator).share({ title: "Lingona", text, url });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast("Đã copy link mời bạn");
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      /* user dismissed, ignore */
    }
  };

  const items: MenuItem[] = [
    { label: "Thêm bạn",           onClick: () => go("/friends/add"),      icon: <IconUserPlus /> },
    { label: "Lời mời kết bạn",    onClick: () => go("/friends/requests"), icon: <IconUserCheck />, badge: requestCount ?? undefined },
    { label: "Phòng học chung",    onClick: () => go("/friends/rooms"),    icon: <IconDoor /> },
    { label: "Mời bạn qua link",   onClick: handleShare,                   icon: <IconShare /> },
  ];

  return (
    <div className="relative flex items-center justify-between">
      <h1
        className="font-display font-bold tracking-tight"
        style={{ fontSize: 20, color: "var(--color-text)" }}
      >
        Tin nhắn
      </h1>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          aria-label="Mở menu tuỳ chọn"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 36,
            height: 36,
            color: "var(--color-text-secondary)",
            border: "1px solid var(--color-border)",
            background: open ? "var(--color-bg-secondary)" : "transparent",
          }}
        >
          <IconKebab />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 z-sticky mt-2 rounded-xl overflow-hidden"
            style={{
              minWidth: 240,
              background: "var(--color-bg-card)",
              border: "1px solid var(--color-border)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          >
            <ul className="py-1">
              {items.map((it, i) => (
                <li key={i} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={it.onClick}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:brightness-95"
                    style={{
                      color: it.danger ? "#EF4444" : "var(--color-text)",
                      background: "transparent",
                    }}
                  >
                    <span style={{ color: "var(--color-text-secondary)" }}>{it.icon}</span>
                    <span className="flex-1">{it.label}</span>
                    {typeof it.badge === "number" && it.badge > 0 && (
                      <span
                        className="inline-flex items-center justify-center rounded-full px-2 text-[10px] font-semibold"
                        style={{
                          minWidth: 20,
                          height: 18,
                          background: "rgba(240,149,149,0.22)",
                          color: "#F09595",
                        }}
                      >
                        {it.badge > 99 ? "99+" : it.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-sticky rounded-full px-4 py-2 text-xs font-medium"
          style={{ background: "var(--color-teal)", color: "#fff" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
