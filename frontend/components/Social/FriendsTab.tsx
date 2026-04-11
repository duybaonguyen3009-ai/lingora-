"use client";

/**
 * FriendsTab.tsx — Main social hub with 3 sub-tabs: Friends, Requests, Add Friend.
 *
 * Friends: list with ping button for inactive friends.
 * Requests: incoming (accept/reject) + outgoing (cancel).
 * Add Friend: search by username or enter QR token.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getFriends,
  removeFriend,
  getIncomingRequests,
  getOutgoingRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  sendPing,
  getSocialProfile,
  setSocialUsername,
  getQrToken,
} from "@/lib/api";
import type { Friend, FriendRequest, SocialProfile } from "@/lib/types";

type SubTab = "friends" | "requests" | "add";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
      style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", color: "#fff" }}
    >
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Friends List
// ---------------------------------------------------------------------------

function FriendsList() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFriends();
      setFriends(data.friends);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePing = async (friendId: string) => {
    setPinging(friendId);
    try {
      await sendPing({ receiverUserId: friendId, messageTemplateKey: "havent_practiced_today" });
    } catch { /* silent */ }
    setPinging(null);
  };

  const handleRemove = async (friendId: string) => {
    if (!confirm("Remove this friend?")) return;
    try {
      await removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-3xl mb-3">👥</div>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No friends yet. Add some!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {friends.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 p-3 rounded-lg"
          style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <div className="relative">
            <Avatar name={f.name} />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
              style={{
                background: f.practiced_today ? "#22C55E" : "#9CA3AF",
                borderColor: "var(--color-bg-card)",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
              {f.name}
            </div>
            {f.username && (
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>@{f.username}</div>
            )}
          </div>
          {!f.practiced_today && (
            <button
              onClick={() => handlePing(f.id)}
              disabled={pinging === f.id}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
              style={{ background: "rgba(245,158,11,0.10)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              {pinging === f.id ? "..." : "Ping 👋"}
            </button>
          )}
          <button
            onClick={() => handleRemove(f.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
            title="Remove friend"
          >
            ···
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function RequestsList() {
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, out] = await Promise.all([getIncomingRequests(), getOutgoingRequests()]);
      setIncoming(inc.requests);
      setOutgoing(out.requests);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
    } catch { /* silent */ }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectFriendRequest(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
    } catch { /* silent */ }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelFriendRequest(id);
      setOutgoing((prev) => prev.filter((r) => r.id !== id));
    } catch { /* silent */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Incoming */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
          Incoming ({incoming.length})
        </div>
        {incoming.length === 0 ? (
          <p className="text-sm py-3" style={{ color: "var(--color-text-secondary)" }}>No pending requests</p>
        ) : (
          <div className="flex flex-col gap-2">
            {incoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
              >
                <Avatar name={r.sender_name || "?"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                    {r.sender_name}
                  </div>
                </div>
                <button
                  onClick={() => handleAccept(r.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "#00A896", color: "#fff" }}
                >
                  Accept
                </button>
                <button
                  onClick={() => handleReject(r.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
          Sent ({outgoing.length})
        </div>
        {outgoing.length === 0 ? (
          <p className="text-sm py-3" style={{ color: "var(--color-text-secondary)" }}>No outgoing requests</p>
        ) : (
          <div className="flex flex-col gap-2">
            {outgoing.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg"
                style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
              >
                <Avatar name={r.receiver_name || "?"} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                    {r.receiver_name}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                  Pending
                </span>
                <button
                  onClick={() => handleCancel(r.id)}
                  className="text-xs font-medium"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Friend
// ---------------------------------------------------------------------------

function AddFriend() {
  const [searchUsername, setSearchUsername] = useState("");
  const [qrInput, setQrInput] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [profile, setProfile] = useState<SocialProfile | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    getSocialProfile().then(setProfile).catch(() => {});
  }, []);

  // Generate QR code image
  useEffect(() => {
    if (!profile?.qrToken) {
      getQrToken().then((data) => {
        setProfile((p) => p ? { ...p, qrToken: data.qrToken } : p);
      }).catch(() => {});
    }
  }, [profile?.qrToken]);

  useEffect(() => {
    if (!profile?.qrToken) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(profile.qrToken!, { width: 200, margin: 2, color: { dark: "#1B2B4B", light: "#ffffff" } })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [profile?.qrToken]);

  const handleSearchAdd = async () => {
    if (!searchUsername.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      await sendFriendRequest({ username: searchUsername.trim() });
      setMessage({ text: "Friend request sent!", ok: true });
      setSearchUsername("");
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed", ok: false });
    }
    setSending(false);
  };

  const handleQrAdd = async () => {
    if (!qrInput.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      await sendFriendRequest({ qrToken: qrInput.trim() });
      setMessage({ text: "Friend request sent!", ok: true });
      setQrInput("");
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed", ok: false });
    }
    setSending(false);
  };

  const handleSetUsername = async () => {
    if (!newUsername.trim()) return;
    try {
      await setSocialUsername(newUsername.trim());
      setProfile((p) => p ? { ...p, username: newUsername.trim() } : p);
      setEditingUsername(false);
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed", ok: false });
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Your profile info */}
      <div className="rounded-lg p-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
          Your Username
        </div>
        {editingUsername ? (
          <div className="flex gap-2">
            <input
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="3-20 chars, letters/numbers/_"
              className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            />
            <button onClick={handleSetUsername} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "#00A896", color: "#fff" }}>
              Save
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
              {profile?.username ? `@${profile.username}` : "Not set"}
            </span>
            <button
              onClick={() => { setEditingUsername(true); setNewUsername(profile?.username || ""); }}
              className="text-xs font-medium"
              style={{ color: "#00A896" }}
            >
              {profile?.username ? "Edit" : "Set username"}
            </button>
          </div>
        )}
      </div>

      {/* Search by username */}
      <div className="rounded-lg p-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>
          Search by Username
        </div>
        <div className="flex gap-2">
          <input
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            placeholder="Enter username..."
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
            onKeyDown={(e) => e.key === "Enter" && handleSearchAdd()}
          />
          <button
            onClick={handleSearchAdd}
            disabled={sending || !searchUsername.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: "#00A896", color: "#fff" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="rounded-lg p-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--color-text-tertiary)" }}>
          Your QR Code
        </div>
        {qrDataUrl ? (
          <div className="flex justify-center mb-3">
            <img src={qrDataUrl} alt="Your QR Code" className="w-40 h-40 rounded-lg" style={{ background: "#fff" }} />
          </div>
        ) : (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
          </div>
        )}
        <p className="text-xs text-center mb-3" style={{ color: "var(--color-text-secondary)" }}>
          Share this QR code with friends to connect
        </p>

        {/* Manual QR token input */}
        <div className="text-xs font-bold uppercase tracking-wider mb-2 mt-4" style={{ color: "var(--color-text-tertiary)" }}>
          Enter Friend&apos;s QR Token
        </div>
        <div className="flex gap-2">
          <input
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="Paste QR token..."
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
          />
          <button
            onClick={handleQrAdd}
            disabled={sending || !qrInput.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
            style={{ background: "#00A896", color: "#fff" }}
          >
            Add
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className="rounded-lg px-4 py-3 text-sm text-center"
          style={{
            background: message.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            color: message.ok ? "#22C55E" : "#EF4444",
            border: `1px solid ${message.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FriendsTab
// ---------------------------------------------------------------------------

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "friends", label: "Friends" },
  { id: "requests", label: "Requests" },
  { id: "add", label: "Add Friend" },
];

export default function FriendsTab() {
  const [subTab, setSubTab] = useState<SubTab>("friends");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-display font-bold" style={{ color: "var(--color-text)" }}>
          Friends
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          Practice together, stay accountable
        </p>
      </div>

      {/* Sub-tab toggle */}
      <div
        className="flex rounded-lg overflow-hidden"
        style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}
      >
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className="flex-1 py-2.5 text-sm font-medium transition-all"
            style={{
              background: subTab === t.id ? "var(--color-accent)" : "transparent",
              color: subTab === t.id ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === "friends" && <FriendsList />}
      {subTab === "requests" && <RequestsList />}
      {subTab === "add" && <AddFriend />}
    </div>
  );
}
