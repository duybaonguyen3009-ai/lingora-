"use client";

/**
 * StudyRoomTab.tsx — Study rooms list + room dashboard overlay.
 */

import { useState, useEffect, useCallback } from "react";
import Mascot from "@/components/ui/Mascot";
import {
  getMyStudyRooms, createStudyRoom, getStudyRoomDashboard,
  acceptRoomInvite, leaveStudyRoom, createRoomNote, sendRoomNudge,
  getFriends,
} from "@/lib/api";
import Skeleton from "@/components/ui/Skeleton";
import type { StudyRoom, StudyRoomDashboard, StudyRoomMember, Friend } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center font-bold text-xs shrink-0`}
      style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", color: "#fff", width: size * 4, height: size * 4 }}
    >
      {initials}
    </div>
  );
}

function GoalRing({ progress, target }: { progress: number; target: number }) {
  const pct = Math.min((progress / target) * 100, 100);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width="88" height="88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-border)" strokeWidth="6" />
      <circle cx="44" cy="44" r={r} fill="none" stroke="url(#goalGrad)" strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 44 44)" style={{ transition: "stroke-dashoffset 600ms ease-out" }} />
      <defs><linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00A896" /><stop offset="100%" stopColor="#00C4B0" />
      </linearGradient></defs>
      <text x="44" y="44" textAnchor="middle" dy="0.35em" fill="var(--color-text)" fontSize="14" fontWeight="700">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Room Dashboard (full-screen overlay)
// ---------------------------------------------------------------------------

function RoomDashboard({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [dashboard, setDashboard] = useState<StudyRoomDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("tip");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setDashboard(await getStudyRoomDashboard(roomId)); } catch { /* silent */ }
    setLoading(false);
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  const handleNudge = async (targetUserId: string) => {
    try { await sendRoomNudge(roomId, { targetUserId }); } catch { /* silent */ }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await createRoomNote(roomId, { noteType, content: noteText.trim() });
      setNoteText("");
      setShowNoteInput(false);
      load();
    } catch { /* silent */ }
  };

  if (loading || !dashboard) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
          <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }}>
            <span style={{ color: "var(--color-text)" }}>←</span>
          </button>
          <span className="font-display font-bold" style={{ color: "var(--color-text)" }}>Loading...</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  const { room, members, activeGoal, recentFeed, pinnedNotes } = dashboard;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "var(--color-bg-card)", borderBottom: "1px solid var(--color-border)" }}>
        <button onClick={onClose} className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--color-bg-secondary)" }}>
          <span style={{ color: "var(--color-text)" }}>←</span>
        </button>
        <div className="flex-1">
          <div className="font-display font-bold text-base" style={{ color: "var(--color-text)" }}>{room.name}</div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>🔥 {room.room_streak} day streak · {members.length} members</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          {/* Goal progress */}
          {activeGoal && (
            <div className="rounded-lg p-4 flex items-center gap-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <GoalRing progress={activeGoal.total_progress ?? 0} target={activeGoal.target_value} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {activeGoal.goal_type.replace(/_/g, " ")}
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {activeGoal.total_progress ?? 0} / {activeGoal.target_value} · ends {new Date(activeGoal.end_date).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}

          {/* Squad Status */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>Squad Status</div>
            <div className="flex flex-col gap-2">
              {members.map((m: StudyRoomMember) => (
                <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                  <div className="relative">
                    <Avatar name={m.name} size={10} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: m.practiced_today ? "#22C55E" : "#9CA3AF", borderColor: "var(--color-bg-card)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{m.name}</div>
                    <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                      {m.practiced_today ? `✅ ${m.xp_today} XP · ${m.speaking_sessions_today}S · ${m.writing_sessions_today}W` : "⏳ Not yet today"}
                    </div>
                  </div>
                  {!m.practiced_today && m.role !== "owner" && (
                    <button onClick={() => handleNudge(m.user_id)} className="px-2 py-1 rounded-full text-xs" style={{ background: "rgba(245,158,11,0.10)", color: "#F59E0B" }}>
                      Nudge
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>Notes</span>
              <button onClick={() => setShowNoteInput(!showNoteInput)} className="text-xs font-medium" style={{ color: "#00A896" }}>
                {showNoteInput ? "Cancel" : "+ Add"}
              </button>
            </div>
            {showNoteInput && (
              <div className="flex flex-col gap-2 mb-3 p-3 rounded-lg" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                <div className="flex gap-1">
                  {["tip", "reminder", "motivation", "question"].map((t) => (
                    <button key={t} onClick={() => setNoteType(t)} className="px-2 py-1 rounded text-xs font-medium"
                      style={{ background: noteType === t ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)", color: noteType === t ? "#00A896" : "var(--color-text-secondary)" }}>
                      {t}
                    </button>
                  ))}
                </div>
                <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note..." rows={2} maxLength={500}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
                <button onClick={handleAddNote} disabled={!noteText.trim()} className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "#00A896", color: "#fff" }}>
                  Post
                </button>
              </div>
            )}
            {pinnedNotes.length === 0 && !showNoteInput && (
              <p className="text-sm py-2" style={{ color: "var(--color-text-secondary)" }}>Chưa có ghi chú nào</p>
            )}
            {pinnedNotes.map((n) => (
              <div key={n.id} className="p-3 rounded-lg mb-2" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: "rgba(0,168,150,0.10)", color: "#00A896" }}>{n.note_type}</span>
                  {n.is_pinned && <span className="text-xs">📌</span>}
                  <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>{n.author_name}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--color-text)" }}>{n.content}</p>
              </div>
            ))}
          </div>

          {/* Activity Feed */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-tertiary)" }}>Recent Activity</div>
            {recentFeed.length === 0 ? (
              <p className="text-sm py-2" style={{ color: "var(--color-text-secondary)" }}>Chưa có hoạt động nào</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {recentFeed.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#00A896" }} />
                    <span><b style={{ color: "var(--color-text)" }}>{f.name}</b> {f.activity_type.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Room Modal
// ---------------------------------------------------------------------------

function CreateRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState("speaking_sessions");
  const [targetValue, setTargetValue] = useState(10);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { getFriends().then((d) => setFriends(d.friends)).catch(() => {}); }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createStudyRoom({ name: name.trim(), invitedUserIds: selectedFriends, goalType, targetValue });
      onCreated();
      onClose();
    } catch { /* silent */ }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-sheet flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl p-5 flex flex-col gap-4" style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
        <h3 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Create Study Room</h3>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name" className="rounded-lg px-3 py-2.5 text-sm"
          style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />

        <div>
          <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Weekly Goal</div>
          <div className="flex gap-2">
            <select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="flex-1 rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <option value="speaking_sessions">Speaking Sessions</option>
              <option value="writing_tasks">Writing Tasks</option>
              <option value="lessons">Lessons</option>
              <option value="xp">XP</option>
            </select>
            <input type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} min={1} max={100}
              className="w-20 rounded-lg px-3 py-2 text-sm text-center" style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", color: "var(--color-text)" }} />
          </div>
        </div>

        {friends.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-tertiary)" }}>Invite Friends</div>
            <div className="flex flex-wrap gap-2">
              {friends.map((f) => (
                <button key={f.id} onClick={() => setSelectedFriends((p) => p.includes(f.id) ? p.filter((x) => x !== f.id) : [...p, f.id])}
                  className="px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: selectedFriends.includes(f.id) ? "rgba(0,168,150,0.15)" : "var(--color-bg-secondary)",
                    color: selectedFriends.includes(f.id) ? "#00A896" : "var(--color-text-secondary)",
                    border: `1px solid ${selectedFriends.includes(f.id) ? "rgba(0,168,150,0.3)" : "var(--color-border)"}` }}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-secondary)" }}>Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim() || creating} className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50" style={{ background: "#00A896", color: "#fff" }}>
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main StudyRoomTab
// ---------------------------------------------------------------------------

export default function StudyRoomTab() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const data = await getMyStudyRooms(); setRooms(data.rooms); } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (activeRoomId) {
    return <RoomDashboard roomId={activeRoomId} onClose={() => { setActiveRoomId(null); load(); }} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold" style={{ color: "var(--color-text)" }}>Study Rooms</h3>
        <button onClick={() => setShowCreate(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#00A896", color: "#fff" }}>
          + Create Room
        </button>
      </div>

      {loading ? (
        <Skeleton.List count={3} />
      ) : rooms.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-3">
          <Mascot size={56} mood="thinking" />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Chưa có phòng học nào! Tạo phòng và mời bạn bè nhé 🐙</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rooms.map((room) => (
            <button key={room.id} onClick={() => setActiveRoomId(room.id)}
              className="flex items-center gap-3 p-4 rounded-lg text-left transition-all active:scale-[0.98]"
              style={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{room.name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  🔥 {room.room_streak} · {room.memberCount ?? "?"} members
                  {room.activeGoal && ` · Goal: ${room.activeGoal.goal_type.replace(/_/g, " ")}`}
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--color-text-tertiary)" }}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
