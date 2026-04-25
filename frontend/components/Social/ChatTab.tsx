"use client";

/**
 * ChatTab.tsx — Friend chat with conversation list + chat window.
 *
 * Desktop: split view (list left, chat right).
 * Mobile: full-screen list → tap → full-screen chat.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Mascot from "@/components/ui/Mascot";
import { getChatConversations, getChatMessages, sendChatMessage, sendVoiceNote, markChatSeen } from "@/lib/api";
import { extractWaveform, validatePeaks, fallbackPeaks } from "@/lib/audio-waveform";
import { useAuthStore } from "@/lib/stores/authStore";
import { useSocket } from "@/contexts/SocketContext";
import { usePresence } from "@/contexts/PresenceContext";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import Skeleton from "@/components/ui/Skeleton";
import type { ChatMessage, Conversation } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * PR7.2 — merge delta-poll results into the existing message list.
 *
 * Three cases per incoming row:
 *   1. Row has a client_message_id we've already merged → drop (dedup).
 *   2. Row has a client_message_id that matches a pending/failed optimistic
 *      bubble → replace the optimistic bubble with the server row in place.
 *   3. Otherwise → append to the end.
 *
 * `seenCidsRef` is mutated so subsequent polls don't re-append the same row.
 * (ChatMessageUI augmentation is local to ChatTab.)
 */
function mergeDelta<T extends { id: string; client_message_id?: string | null }>(
  current: T[],
  delta: T[],
  seenCidsRef: { current: Set<string> },
): T[] {
  if (delta.length === 0) return current;

  let next = current;
  for (const row of delta) {
    const cid = row.client_message_id ?? null;

    if (cid) {
      // (1) already merged — skip
      if (seenCidsRef.current.has(cid)) {
        // But if a matching optimistic bubble exists and still says pending,
        // fall through to replace it (happens when the initial echo raced the optimistic render).
        const optIdx = next.findIndex(
          (m) => m.client_message_id === cid && (m as T & { pending?: boolean }).pending,
        );
        if (optIdx === -1) continue;
        next = [...next.slice(0, optIdx), row, ...next.slice(optIdx + 1)];
        continue;
      }

      // (2) optimistic bubble match — replace in place
      const optIdx = next.findIndex((m) => m.client_message_id === cid);
      if (optIdx !== -1) {
        next = [...next.slice(0, optIdx), row, ...next.slice(optIdx + 1)];
        seenCidsRef.current.add(cid);
        continue;
      }

      seenCidsRef.current.add(cid);
    }

    // (3) genuinely new — append
    next = [...next, row];
  }
  return next;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d`;
}

function Avatar({ name, avatar, size = 40, online }: {
  name: string;
  avatar?: string | null;
  size?: number;
  /** PR9 — render a green presence dot at bottom-right when true. */
  online?: boolean;
}) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="rounded-full w-full h-full flex items-center justify-center font-semibold text-xs overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--color-avatar-from), var(--color-avatar-to))", color: "#fff" }}>
        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials}
      </div>
      {online && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            width: Math.max(9, Math.round(size * 0.28)),
            height: Math.max(9, Math.round(size * 0.28)),
            bottom: 0,
            right: 0,
            background: "#5DCAA5",
            border: "2px solid var(--color-bg-page)",
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation List
// ---------------------------------------------------------------------------

function ConversationList({ conversations, activeId, onSelect, loading }: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  loading: boolean;
}) {
  const [search, setSearch] = useState("");

  if (loading) return <Skeleton.List count={4} />;

  const filtered = search.trim()
    ? conversations.filter((c) => c.friend_name.toLowerCase().includes(search.toLowerCase()) || c.friend_username?.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-3">
            <Mascot size={56} mood="thinking" />
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {search ? "Không tìm thấy" : "Chưa có tin nhắn nào! Nhắn cho bạn bè nhé 🐙"}
            </p>
          </div>
        ) : (
          filtered.map((c) => (
            <button key={c.friend_id} onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left transition-all"
              style={{
                background: activeId === c.friend_id ? "rgba(0,168,150,0.06)" : "transparent",
                borderLeft: activeId === c.friend_id ? "3px solid #00A896" : "3px solid transparent",
              }}>
              <Avatar name={c.friend_name} avatar={c.friend_avatar} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{c.friend_name}</span>
                  <span className="text-xs shrink-0 ml-2" style={{ color: "var(--color-text-tertiary)" }}>{timeAgo(c.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {c.last_type === "voice" ? "🎤 Voice note" : c.last_content?.slice(0, 35) || "Start chatting"}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ background: "#00A896", color: "#fff" }}>{c.unread_count > 9 ? "9+" : c.unread_count}</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chat Window
// ---------------------------------------------------------------------------

// PR7.2 — local UI augmentation of ChatMessage. Server-side fields are
// unchanged; `pending`/`failed` are client-only hints while an optimistic
// bubble is in flight, and `local_audio_url` lets us preview voice blobs
// before the upload round-trip completes.
type ChatMessageUI = ChatMessage & {
  pending?: boolean;
  failed?: boolean;
  local_audio_url?: string;
};

function ChatWindow({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // PR7.2 — dedup tracker for delta polling. Holds every client_message_id
  // we've seen so a server row arriving via ?after= can be matched back
  // to its optimistic bubble and merged in place.
  const seenCidsRef = useRef<Set<string>>(new Set());
  // PR9 — server message IDs already rendered. Shields against socket + delta
  // poll delivering the same row twice (friend-origin messages have no CID).
  const seenIdsRef = useRef<Set<string>>(new Set());

  const friendId = conversation.friend_id;

  // PR9 — realtime plumbing for this conversation.
  const { socket } = useSocket();
  const { isOnline } = usePresence();
  const { friendIsTyping, notifyTyping, notifyStop } = useTypingIndicator(friendId);

  // Load messages — most recent 50.
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChatMessages(friendId, { limit: 50 });
      setMessages(data.messages);
      setHasMore(data.hasMore);
      const cids = new Set<string>();
      const ids = new Set<string>();
      data.messages.forEach((m) => {
        if (m.client_message_id) cids.add(m.client_message_id);
        if (m.id) ids.add(m.id);
      });
      seenCidsRef.current = cids;
      seenIdsRef.current = ids;
    } catch { /* silent */ }
    setLoading(false);
  }, [friendId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // PR7.2 — delta polling. Fetch only messages created after our newest row.
  // Dedupe by client_message_id so our own optimistic bubbles don't duplicate
  // when the server echo lands in the next tick. Interval preserved at 5s.
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        setMessages((prev) => {
          // Derive cursor from committed (non-pending) messages only.
          const committed = prev.filter((m) => !m.pending && !m.failed);
          const lastAt = committed.length > 0 ? committed[committed.length - 1].created_at : undefined;
          // Kick off the delta fetch asynchronously; updater below handles merge.
          (async () => {
            try {
              const data = await getChatMessages(friendId, lastAt ? { after: lastAt } : { limit: 50 });
              if (!data.messages || data.messages.length === 0) return;
              setMessages((curr) => mergeDelta(curr, data.messages, seenCidsRef));
            } catch { /* silent */ }
          })();
          return prev;
        });
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [friendId]);

  // Mark as seen on open
  useEffect(() => {
    markChatSeen(friendId).catch(() => {});
  }, [friendId]);

  // PR9 — realtime listeners. Polling stays active as fallback; dedup via
  // seenCidsRef (our own optimistic sends) + seenIdsRef (server ids).
  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg: ChatMessage) => {
      const involvesThisThread =
        (msg.sender_id === friendId && msg.receiver_id === userId) ||
        (msg.sender_id === userId && msg.receiver_id === friendId);
      if (!involvesThisThread) return;

      // Dedup 1 — same client_message_id already merged.
      if (msg.client_message_id && seenCidsRef.current.has(msg.client_message_id)) {
        // Still swap if an optimistic bubble is waiting for confirmation.
        setMessages((prev) => prev.map((m) =>
          m.client_message_id === msg.client_message_id && (m as ChatMessageUI).pending
            ? { ...msg, client_message_id: msg.client_message_id }
            : m,
        ));
        return;
      }
      // Dedup 2 — same server id already rendered.
      if (seenIdsRef.current.has(msg.id)) return;

      if (msg.client_message_id) seenCidsRef.current.add(msg.client_message_id);
      seenIdsRef.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
    };

    const onDelivered = (payload: { message_id?: string; client_message_id?: string }) => {
      if (!payload?.client_message_id) return;
      setMessages((prev) => prev.map((m) =>
        m.client_message_id === payload.client_message_id
          ? { ...m, id: payload.message_id ?? m.id, pending: false }
          : m,
      ));
      if (payload.message_id) seenIdsRef.current.add(payload.message_id);
    };

    const onSeen = (payload: { userId?: string }) => {
      if (payload?.userId !== friendId) return;
      const nowIso = new Date().toISOString();
      setMessages((prev) => prev.map((m) =>
        m.sender_id === userId && !m.seen_at ? { ...m, seen_at: nowIso } : m,
      ));
    };

    socket.on("new_message", onNewMessage);
    socket.on("message_delivered", onDelivered);
    socket.on("messages_seen", onSeen);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("message_delivered", onDelivered);
      socket.off("messages_seen", onSeen);
    };
  }, [socket, friendId, userId]);

  // PR7.2 — Send text with client-generated UUID for idempotency.
  // Optimistic bubble gets `pending: true`; on failure we mark `failed: true`
  // and keep the CID so the retry button can resend with the same id
  // (backend returns 200 with the existing row instead of creating a dupe).
  const sendTextWithCid = async (text: string, clientMessageId: string) => {
    try {
      const real = await sendChatMessage(friendId, text, clientMessageId);
      seenCidsRef.current.add(clientMessageId);
      setMessages((prev) => prev.map((m) =>
        m.client_message_id === clientMessageId
          ? { ...real, client_message_id: clientMessageId }
          : m,
      ));
    } catch {
      setMessages((prev) => prev.map((m) =>
        m.client_message_id === clientMessageId
          ? { ...m, pending: false, failed: true }
          : m,
      ));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    notifyStop(); // PR9 — tell the friend we've stopped typing now that we've sent.

    const clientMessageId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
      ? crypto.randomUUID()
      : `cid-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const optimistic: ChatMessageUI = {
      id: `temp-${clientMessageId}`,
      client_message_id: clientMessageId,
      sender_id: userId!, receiver_id: friendId,
      type: "text", content: text, audio_url: null, audio_duration_seconds: null,
      seen_at: null, created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    seenCidsRef.current.add(clientMessageId);

    await sendTextWithCid(text, clientMessageId);
    setSending(false);
  };

  // Retry a failed text bubble with the same CID (idempotent on backend).
  const handleRetry = async (msg: ChatMessageUI) => {
    if (!msg.client_message_id || !msg.content) return;
    setMessages((prev) => prev.map((m) =>
      m.client_message_id === msg.client_message_id
        ? { ...m, pending: true, failed: false }
        : m,
    ));
    await sendTextWithCid(msg.content, msg.client_message_id);
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = recordTime;

        // PR7.3 — extract waveform client-side before the upload. Falls back
        // to a uniform array on decode failure so we never block the send.
        const peaks = validatePeaks(await extractWaveform(blob));

        // PR7.2 — optimistic voice bubble. Preview plays from a local object URL
        // while the upload runs; replaced by the server row (with the CDN
        // audio_url) on success.
        const clientMessageId = (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `cid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const localUrl = URL.createObjectURL(blob);
        const optimistic: ChatMessageUI = {
          id: `temp-${clientMessageId}`,
          client_message_id: clientMessageId,
          sender_id: userId!, receiver_id: friendId,
          type: "voice", content: null,
          audio_url: null,
          audio_duration_seconds: duration,
          seen_at: null, created_at: new Date().toISOString(),
          pending: true,
          local_audio_url: localUrl,
          waveform_peaks: peaks.length > 0 ? peaks : null,
        };
        setMessages((prev) => [...prev, optimistic]);
        seenCidsRef.current.add(clientMessageId);

        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const real = await sendVoiceNote(
              friendId,
              reader.result as string,
              duration,
              clientMessageId,
              peaks.length > 0 ? peaks : undefined,
            );
            URL.revokeObjectURL(localUrl);
            setMessages((prev) => prev.map((m) =>
              m.client_message_id === clientMessageId
                ? { ...real, client_message_id: clientMessageId }
                : m,
            ));
          } catch {
            setMessages((prev) => prev.map((m) =>
              m.client_message_id === clientMessageId
                ? { ...m, pending: false, failed: true }
                : m,
            ));
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRef.current = recorder;
      setRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime((t) => {
          if (t >= 59) { stopRecording(); return 60; }
          return t + 1;
        });
      }, 1000);
    } catch { /* mic permission denied */ }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === "recording") mediaRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    mediaRef.current = null;
  };

  // Load more (scroll to top) — PR7.2 now uses explicit options object.
  const handleLoadMore = async () => {
    if (!hasMore || messages.length === 0) return;
    try {
      const data = await getChatMessages(friendId, { before: messages[0].created_at, limit: 50 });
      data.messages.forEach((m) => { if (m.client_message_id) seenCidsRef.current.add(m.client_message_id); });
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onBack} className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }}>
          <span style={{ color: "var(--color-text)" }}>←</span>
        </button>
        <Avatar name={conversation.friend_name} avatar={conversation.friend_avatar} size={36} online={isOnline(friendId)} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{conversation.friend_name}</div>
          <div className="text-xs" style={{ color: isOnline(friendId) ? "var(--color-teal-meta)" : "var(--color-text-tertiary)" }}>
            {isOnline(friendId)
              ? "Đang hoạt động"
              : conversation.friend_username ? `@${conversation.friend_username}` : ""}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {hasMore && (
          <button onClick={handleLoadMore} className="text-xs text-center py-2 font-medium" style={{ color: "#00A896" }}>
            Load older messages
          </button>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Skeleton.List count={3} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="text-3xl mb-2">👋</div>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Say hello to {conversation.friend_name}!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === userId;
            const pending = !!msg.pending;
            const failed = !!msg.failed;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%]" style={{ opacity: pending || failed ? 0.65 : 1 }}>
                  <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isMine ? "linear-gradient(135deg, #00A896, #00C4B0)" : "var(--color-bg-card)",
                      color: isMine ? "#fff" : "var(--color-text)",
                      border: failed ? "1px solid var(--color-amber)" : isMine ? "none" : "1px solid var(--color-border)",
                      borderBottomRightRadius: isMine ? 6 : 16,
                      borderBottomLeftRadius: isMine ? 16 : 6,
                    }}>
                    {msg.type === "voice" ? (
                      (() => {
                        // PR7.3 — data-driven waveform. 64 bars from the peaks
                        // array (downsample if server sent more). Legacy rows
                        // with null peaks fall back to uniform bars so the
                        // bubble never empties out.
                        const BARS = 64;
                        const raw = Array.isArray(msg.waveform_peaks) && msg.waveform_peaks.length > 0
                          ? msg.waveform_peaks
                          : fallbackPeaks(BARS);
                        const stride = raw.length > BARS ? raw.length / BARS : 1;
                        const bars: number[] = [];
                        for (let i = 0; i < BARS; i++) {
                          const idx = Math.min(raw.length - 1, Math.floor(i * stride));
                          bars.push(raw[idx] ?? 0);
                        }
                        const durSec = msg.audio_duration_seconds ?? 0;
                        return (
                          <div className="flex items-center gap-2 min-w-[180px]">
                            <span className="text-lg" aria-hidden>🎤</span>
                            <div
                              className="flex-1 flex items-center gap-[2px]"
                              role="img"
                              aria-label={`Tin nhắn thoại ${durSec} giây`}
                            >
                              {bars.map((peak, i) => (
                                <span
                                  key={i}
                                  aria-hidden
                                  className="rounded-full"
                                  style={{
                                    width: 2,
                                    height: `${Math.max(3, peak * 28)}px`,
                                    background: isMine ? "rgba(255,255,255,0.7)" : "var(--color-accent)",
                                    display: "inline-block",
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-xs font-mono" style={{ color: isMine ? "rgba(255,255,255,0.7)" : "var(--color-text-tertiary)" }}>
                              0:{String(durSec).padStart(2, "0")}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{timeAgo(msg.created_at)}</span>
                    {isMine && !pending && !failed && (
                      <span className="text-xs" style={{ color: msg.seen_at ? "#00A896" : "var(--color-text-tertiary)" }}>
                        {msg.seen_at ? "✓✓" : "✓"}
                      </span>
                    )}
                    {isMine && pending && (
                      <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>Đang gửi…</span>
                    )}
                    {isMine && failed && msg.type === "text" && (
                      <button
                        type="button"
                        onClick={() => handleRetry(msg)}
                        className="text-xs font-medium underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
                        style={{ color: "var(--color-amber)" }}
                        aria-label="Thử lại gửi tin nhắn"
                      >
                        Bấm để thử lại
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* PR9 — typing indicator bubble, shown just above the composer.
          Bars animate via transform only (baseline-ui: no layout props). */}
      {friendIsTyping && (
        <div className="px-4 pb-1 shrink-0 flex items-center gap-2" aria-live="polite">
          <Avatar name={conversation.friend_name} avatar={conversation.friend_avatar} size={22} />
          <div
            className="inline-flex items-center gap-1 px-3 py-2 rounded-2xl"
            style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                aria-hidden
                className="inline-block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--color-text-tertiary)",
                  animation: `typingDot 1.2s ease-in-out ${i * 150}ms infinite`,
                }}
              />
            ))}
          </div>
          <span className="sr-only">{conversation.friend_name} đang gõ tin nhắn</span>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-2 shrink-0 flex items-end gap-2" style={{ background: "var(--color-bg-card)", borderTop: "1px solid var(--color-border)" }}>
        {recording ? (
          <div className="flex-1 flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#EF4444" }} />
            <div className="flex items-center gap-0.5 flex-1">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-1 rounded-full" style={{ height: `${6 + Math.random() * 14}px`, background: "#EF4444", animation: `waveBar 0.4s ease-in-out ${i * 30}ms infinite alternate` }} />
              ))}
            </div>
            <span className="text-sm font-mono" style={{ color: "#EF4444" }}>0:{String(recordTime).padStart(2, "0")}</span>
            <button onClick={stopRecording} className="text-xs font-medium px-2 py-1 rounded" style={{ background: "#EF4444", color: "#fff" }}>
              Send
            </button>
          </div>
        ) : (
          <>
            <button
              onMouseDown={startRecording} onTouchStart={startRecording}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90"
              style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>
              🎤
            </button>
            <textarea
              value={input}
              onChange={(e) => {
                const v = e.target.value;
                setInput(v);
                // PR9 — debounced typing notifier. Empty input stops immediately
                // so a cleared draft doesn't keep the bubble showing on the
                // friend's side.
                if (v.length > 0) notifyTyping();
                else notifyStop();
              }}
              onBlur={notifyStop}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Message..."
              rows={1}
              className="flex-1 rounded-xl px-3.5 py-2.5 text-sm resize-none max-h-[80px]"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
            <button onClick={handleSend} disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 disabled:opacity-40"
              style={{ background: input.trim() ? "#00A896" : "var(--color-bg-secondary)", color: input.trim() ? "#fff" : "var(--color-text-tertiary)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes waveBar {
          from { height: 6px; }
          to { height: 18px; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ChatTab
// ---------------------------------------------------------------------------

interface ChatTabProps {
  /** When provided, renders ChatWindow directly (desktop embed from FriendsTab) */
  externalConversation?: Conversation | null;
  onBack?: () => void;
}

export default function ChatTab({ externalConversation, onBack }: ChatTabProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChatConversations();
      setConversations(data.conversations);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll conversations every 10s (fallback)
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const data = await getChatConversations();
        setConversations(data.conversations);
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(poll);
  }, []);

  // External conversation mode — render ChatWindow directly
  if (externalConversation) {
    return <ChatWindow conversation={externalConversation} onBack={onBack || (() => {})} />;
  }

  const activeId = activeConversation?.friend_id ?? null;

  // Mobile: show full-screen chat
  if (activeConversation) {
    return (
      <div className="md:hidden fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
        <ChatWindow conversation={activeConversation} onBack={() => { setActiveConversation(null); load(); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0" style={{ minHeight: 400 }}>
      {/* Desktop: split view */}
      <div className="hidden md:flex rounded-xl overflow-hidden" style={{ height: 500, background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <div className="w-[300px] shrink-0" style={{ borderRight: "1px solid var(--color-border)" }}>
          <ConversationList conversations={conversations} activeId={activeId}
            onSelect={setActiveConversation} loading={loading} />
        </div>
        <div className="flex-1">
          {activeConversation ? (
            <ChatWindow conversation={activeConversation} onBack={() => setActiveConversation(null)} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Select a conversation</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: full-screen list */}
      <div className="md:hidden">
        <ConversationList conversations={conversations} activeId={null} onSelect={setActiveConversation} loading={loading} />
      </div>
    </div>
  );
}
