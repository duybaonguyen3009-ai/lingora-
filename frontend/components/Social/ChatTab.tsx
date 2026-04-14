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
import { useAuthStore } from "@/lib/stores/authStore";
import Skeleton from "@/components/ui/Skeleton";
import type { ChatMessage, Conversation } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function Avatar({ name, avatar, size = 40 }: { name: string; avatar?: string | null; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", color: "#fff" }}>
      {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : initials}
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
                  <span className="text-[10px] shrink-0 ml-2" style={{ color: "var(--color-text-tertiary)" }}>{timeAgo(c.last_message_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {c.last_type === "voice" ? "🎤 Voice note" : c.last_content?.slice(0, 35) || "Start chatting"}
                  </span>
                  {c.unread_count > 0 && (
                    <span className="ml-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
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

function ChatWindow({ conversation, onBack }: { conversation: Conversation; onBack: () => void }) {
  const userId = useAuthStore((s) => s.user?.id);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  const friendId = conversation.friend_id;

  // Load messages
  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getChatMessages(friendId);
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch { /* silent */ }
    setLoading(false);
  }, [friendId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Poll for new messages (fallback — Socket.IO primary)
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const data = await getChatMessages(friendId);
        setMessages(data.messages);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(poll);
  }, [friendId]);

  // Mark as seen on open
  useEffect(() => {
    markChatSeen(friendId).catch(() => {});
  }, [friendId]);

  // Send text
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`, sender_id: userId!, receiver_id: friendId,
      type: "text", content: text, audio_url: null, audio_duration_seconds: null,
      seen_at: null, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const real = await sendChatMessage(friendId, text);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    }
    setSending(false);
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
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const real = await sendVoiceNote(friendId, reader.result as string, recordTime);
            setMessages((prev) => [...prev, real]);
          } catch { /* silent */ }
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

  // Load more (scroll to top)
  const handleLoadMore = async () => {
    if (!hasMore || messages.length === 0) return;
    try {
      const data = await getChatMessages(friendId, messages[0].created_at);
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
        <Avatar name={conversation.friend_name} avatar={conversation.friend_avatar} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{conversation.friend_name}</div>
          {conversation.friend_username && (
            <div className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>@{conversation.friend_username}</div>
          )}
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
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%]">
                  <div className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                    style={{
                      background: isMine ? "linear-gradient(135deg, #00A896, #00C4B0)" : "var(--color-bg-card)",
                      color: isMine ? "#fff" : "var(--color-text)",
                      border: isMine ? "none" : "1px solid var(--color-border)",
                      borderBottomRightRadius: isMine ? 6 : 16,
                      borderBottomLeftRadius: isMine ? 16 : 6,
                    }}>
                    {msg.type === "voice" ? (
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <span className="text-lg">🎤</span>
                        <div className="flex-1 flex items-center gap-0.5">
                          {[...Array(8)].map((_, i) => (
                            <div key={i} className="w-1 rounded-full" style={{ height: `${8 + Math.random() * 12}px`, background: isMine ? "rgba(255,255,255,0.5)" : "var(--color-accent)" }} />
                          ))}
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: isMine ? "rgba(255,255,255,0.7)" : "var(--color-text-tertiary)" }}>
                          0:{String(msg.audio_duration_seconds || 0).padStart(2, "0")}
                        </span>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "justify-end" : "justify-start"}`}>
                    <span className="text-[9px]" style={{ color: "var(--color-text-tertiary)" }}>{timeAgo(msg.created_at)}</span>
                    {isMine && (
                      <span className="text-[9px]" style={{ color: msg.seen_at ? "#00A896" : "var(--color-text-tertiary)" }}>
                        {msg.seen_at ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
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
