"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  useCourses,
  type UnitData,
  type PathNode,
  type NodeStatus,
  type Difficulty,
} from "@/hooks/useCourses";
import { useGuestUser } from "@/lib/guestUser";
import { useProgress } from "@/hooks/useProgress";
import { useUserStats, dateKey } from "@/hooks/useUserStats";
import LessonModal from "./LessonModal";
import type { ApiProgressItem, ApiLesson } from "@/lib/api";
import {
  IconCheck, IconLock, IconPlay, IconClock, IconArrowRight,
  IconFire, IconZap, IconTrophy, IconAward, IconChat,
} from "./Icons";

/* ─── difficulty config ─── */
const DIFF_CONFIG: Record<Difficulty, { label: string; dot: string; bg: string; border: string; text: string }> = {
  easy:   { label: "Easy",   dot: "bg-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  medium: { label: "Medium", dot: "bg-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400" },
  hard:   { label: "Hard",   dot: "bg-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400" },
};

/* ─── daily mission types & computation ─── */
interface DailyMissionItem {
  id: string;
  label: string;
  done: boolean;
  xp: number;
}

/**
 * Derive the three fixed daily missions from real progress + lesson data.
 * All missions are scoped to today's date so they reset each day.
 */
function computeDailyMissions(
  progress: ApiProgressItem[],
  lessons: ApiLesson[]
): DailyMissionItem[] {
  const todayStr = dateKey(new Date());

  // Lessons the user completed today
  const todayCompleted = progress.filter((p) => {
    if (!p.completed || !p.completedAt) return false;
    return dateKey(new Date(p.completedAt)) === todayStr;
  });

  // Map lesson metadata by ID for O(1) lookup
  const lessonMap = new Map(lessons.map((l) => [l.id, l]));

  // Mission 2: sum vocab words from today's lessons
  const vocabToday = todayCompleted.reduce(
    (sum, p) => sum + (lessonMap.get(p.lessonId)?.vocab_count ?? 0),
    0
  );

  // Mission 3: any lesson today with at least one speaking prompt
  const practicedSpeaking = todayCompleted.some(
    (p) => (lessonMap.get(p.lessonId)?.speaking_count ?? 0) > 0
  );

  return [
    { id: "dm-1", label: "Complete a lesson",  done: todayCompleted.length > 0, xp: 10 },
    { id: "dm-2", label: "Learn 10 new words", done: vocabToday >= 10,          xp: 15 },
    { id: "dm-3", label: "Practice speaking",  done: practicedSpeaking,         xp: 20 },
  ];
}

const STREAK_MILESTONES = [3, 7, 14, 30];

const SKILL_XP = [
  { skill: "Vocabulary", xp: 420, color: "from-[#2DA8FF] to-[#82CAFF]" },
  { skill: "Grammar",    xp: 310, color: "from-[#FFA726] to-[#FFD54F]" },
  { skill: "Listening",  xp: 280, color: "from-[#A064FF] to-[#C8A0FF]" },
  { skill: "Speaking",   xp: 180, color: "from-[#2ED3C6] to-[#8BFFE8]" },
  { skill: "Reading",    xp: 130, color: "from-[#64DC82] to-[#A0F0B0]" },
];

const ZIGZAG = [0, 40, 60, 40, 0, -40, -60, -40];

/* ════════════════════════════════════════════════════════════
   SUB-COMPONENTS  (UI identical to original — no design changes)
   ════════════════════════════════════════════════════════════ */

function LevelFilter({ active, onChange }: { active: string; onChange: (v: string) => void }) {
  const levels = ["All", "B1", "B2", "C1"];
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-xl" style={{ backgroundColor: "var(--color-primary-soft)", border: "1px solid var(--color-border)" }}>
      {levels.map((lv) => (
        <button
          key={lv}
          onClick={() => onChange(lv)}
          className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all duration-200 border border-transparent"
          style={
            active === lv
              ? { backgroundColor: "rgba(46,211,198,0.15)", color: "var(--color-success)", borderColor: "rgba(46,211,198,0.25)" }
              : { color: "var(--color-text-secondary)" }
          }
          onMouseEnter={(e) => {
            if (active !== lv) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-primary-soft)";
            }
          }}
          onMouseLeave={(e) => {
            if (active !== lv) {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            }
          }}
        >
          {lv}
        </button>
      ))}
    </div>
  );
}

function DailyMission({ missions }: { missions: DailyMissionItem[] }) {
  const allDone = missions.every((m) => m.done);
  const doneCount = missions.filter((m) => m.done).length;

  return (
    <div className="relative rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] to-amber-600/[0.03] p-5 overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
          <IconFire size={18} className="text-amber-400" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-amber-300">Daily Mission</h3>
          <p className="text-[11px] text-amber-400/60">{doneCount}/{missions.length} completed</p>
        </div>
        {allDone && (
          <span className="ml-auto text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-1 rounded-full">
            All Done!
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2.5">
        {missions.map((m) => (
          <div
            key={m.id}
            className={cn(
              "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200",
              m.done
                ? "bg-amber-500/[0.07] border border-amber-500/15"
                : "border hover:border-amber-500/20"
            )}
            style={!m.done ? { backgroundColor: "var(--color-primary-soft)", borderColor: "var(--color-border)" } : {}}
          >
            <div
              className={cn("w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0", m.done && "bg-amber-400")}
              style={{
                ...(m.done ? { color: "var(--color-bg)" } : { border: "2px solid rgba(255,255,255,0.15)" }),
              }}
            >
              {m.done && <IconCheck size={10} />}
            </div>
            <span
              className={cn("text-[13px]", m.done && "text-amber-300/80 line-through")}
              style={!m.done ? { color: "var(--color-text)" } : {}}
            >
              {m.label}
            </span>
            <span className={cn("ml-auto text-[10px] font-semibold", m.done ? "text-amber-400/50" : "text-amber-400/30")}>+{m.xp} XP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreakMilestones({ streak }: { streak: number }) {
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <IconFire size={16} className="text-amber-400" />
        <h3 className="text-[14px] font-bold" style={{ color: "var(--color-text)" }}>Streak Milestones</h3>
        <span className="ml-auto text-[12px] font-bold text-amber-400">{streak} days</span>
      </div>
      <div className="flex items-center gap-2">
        {STREAK_MILESTONES.map((m) => {
          const achieved = streak >= m;
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-bold transition-all", achieved && "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20")}
                style={
                  achieved
                    ? { color: "var(--color-bg)" }
                    : { backgroundColor: "var(--color-primary-soft)", border: "1px solid var(--color-border)", color: "rgba(166,179,194,0.4)" }
                }
              >
                {achieved ? "\u{1F525}" : m}
              </div>
              <span className={cn("text-[10px] font-semibold", achieved ? "text-amber-400" : "")} style={!achieved ? { color: "rgba(166,179,194,0.4)" } : {}}>{m} days</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SkillXpCard({ totalXp }: { totalXp: number }) {
  const maxXp = Math.max(...SKILL_XP.map((s) => s.xp));
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span style={{ color: "var(--color-success)" }}><IconZap size={14} /></span>
        <h3 className="text-[14px] font-bold" style={{ color: "var(--color-text)" }}>Skill XP</h3>
        <span className="ml-auto text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{totalXp} total XP</span>
      </div>
      <div className="flex flex-col gap-3">
        {SKILL_XP.map((s) => (
          <div key={s.skill} className="flex items-center gap-3">
            <span className="text-[12px] w-[72px] flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>{s.skill}</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
              <div className={cn("h-full rounded-full bg-gradient-to-r", s.color)} style={{ width: `${(s.xp / maxXp) * 100}%`, transition: "width 0.7s ease-out" }} />
            </div>
            <span className="text-[11px] font-semibold w-[40px] text-right" style={{ color: "var(--color-text)" }}>{s.xp}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const c = DIFF_CONFIG[difficulty];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border", c.bg, c.border, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

function AiHintButton() {
  const [showHint, setShowHint] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        onClick={() => setShowHint((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 border",
          showHint
            ? "bg-violet-500/15 border-violet-500/25 text-violet-300"
            : "border-transparent"
        )}
        style={!showHint ? { backgroundColor: "var(--color-primary-soft)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" } : {}}
        onMouseEnter={(e) => {
          if (!showHint) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(139,92,246,0.25)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgb(196,167,255)";
          }
        }}
        onMouseLeave={(e) => {
          if (!showHint) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
          }
        }}
      >
        <IconChat size={11} />
        {showHint ? "Hide Hint" : "Ask AI for Hint"}
      </button>
      {showHint && (
        <div className="mt-2 px-3 py-2.5 rounded-xl bg-violet-500/[0.07] border border-violet-500/15 text-[11px] text-violet-200/80 leading-relaxed max-w-[200px]">
          {"\u{1F4A1}"} Try describing the weather using adjectives like &quot;sunny&quot;, &quot;cloudy&quot;, &quot;windy&quot; before moving to full sentences.
        </div>
      )}
    </div>
  );
}

function MiniProgress({ pct, status }: { pct: number; status: NodeStatus }) {
  if (status === "locked" || pct === 0) return null;
  return (
    <div className="w-16 h-1 rounded-full overflow-hidden mt-1" style={{ backgroundColor: "var(--color-border)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "var(--color-success)" : "linear-gradient(90deg, var(--color-success), var(--color-accent))" }} />
    </div>
  );
}

function ProgressBar({ level, xp, xpToNext }: { level: number; xp: number; xpToNext: number }) {
  const pct = Math.round((xp / (xp + xpToNext)) * 100);
  return (
    <div className="rounded-2xl border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-primary-soft)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-sora font-black text-sm"
            style={{ background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", color: "var(--color-bg)" }}
          >
            {level}
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>Level {level}</p>
            <p className="text-[11px]" style={{ color: "var(--color-text-secondary)" }}>{xp} / {xp + xpToNext} XP to next level</p>
          </div>
        </div>
        <span className="text-[12px] font-bold" style={{ color: "var(--color-success)" }}>{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--color-success), var(--color-accent))", boxShadow: "0 0 12px rgba(46,211,198,0.4)" }} />
      </div>
    </div>
  );
}

function PathNodeItem({ node, index, onOpen }: { node: PathNode; index: number; onOpen: (id: string) => void }) {
  const offset = ZIGZAG[index % ZIGZAG.length];
  const nodeSize = node.type === "boss" ? "w-[72px] h-[72px]" : node.type === "challenge" ? "w-[64px] h-[64px]" : "w-[56px] h-[56px]";

  const bgStyle = (): React.CSSProperties => {
    if (node.status === "completed") return { background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", boxShadow: "0 0 20px rgba(46,211,198,0.3)" };
    if (node.status === "current")   return { background: "linear-gradient(135deg, var(--color-success), var(--color-accent))", boxShadow: "0 0 24px rgba(46,211,198,0.5), 0 0 48px rgba(46,211,198,0.15)" };
    return { background: "#0F2D46", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)" };
  };

  const renderIcon = () => {
    const wrapIcon = (icon: React.ReactNode) => (
      <span style={{ color: node.status === "locked" ? "rgba(166,179,194,0.4)" : "var(--color-bg)" }}>{icon}</span>
    );
    if (node.status === "completed") return wrapIcon(<IconCheck size={node.type === "boss" ? 20 : 16} />);
    if (node.status === "locked")    return wrapIcon(<IconLock  size={node.type === "boss" ? 16 : 12} />);
    if (node.type === "boss")        return wrapIcon(<IconAward size={22} />);
    if (node.type === "challenge")   return wrapIcon(<IconTrophy size={18} />);
    return wrapIcon(<IconPlay size={16} />);
  };

  return (
    <div className="flex flex-col items-center gap-2 transition-all duration-300" style={{ transform: `translateX(${offset}px)` }}>
      <button
        disabled={node.status === "locked"}
        onClick={node.status !== "locked" ? () => onOpen(node.id) : undefined}
        className={cn("relative rounded-full flex items-center justify-center transition-all duration-300", nodeSize, node.status !== "locked" && "cursor-pointer hover:scale-110", node.status === "locked" && "cursor-not-allowed")}
        style={{ ...bgStyle(), ...(node.status === "locked" ? { border: "2px solid var(--color-border)" } : {}) }}
      >
        {renderIcon()}
        {node.status === "current" && (
          <span className="absolute inset-[-4px] rounded-full animate-ping" style={{ border: "2px solid rgba(46,211,198,0.5)", animationDuration: "2s" }} />
        )}
        {node.xp && node.status !== "locked" && (
          <span
            className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid rgba(46,211,198,0.3)", color: "var(--color-success)" }}
          >
            +{node.xp}
          </span>
        )}
      </button>

      <div className="flex flex-col items-center text-center max-w-[140px]">
        <p
          className="text-[12px] font-semibold leading-tight"
          style={{
            color: node.status === "locked"
              ? "rgba(166,179,194,0.4)"
              : node.status === "current"
                ? "var(--color-success)"
                : "var(--color-text)",
          }}
        >
          {node.title}
        </p>
        {node.subtitle && (
          <p
            className="text-[10px] mt-0.5"
            style={{ color: node.status === "locked" ? "rgba(166,179,194,0.25)" : "rgba(166,179,194,0.7)" }}
          >
            {node.subtitle}
          </p>
        )}
        {node.difficulty && node.status !== "locked" && (
          <div className="mt-1.5"><DifficultyBadge difficulty={node.difficulty} /></div>
        )}
        {node.progress !== undefined && <MiniProgress pct={node.progress} status={node.status} />}
        {node.duration && node.status === "current" && (
          <span className="flex items-center gap-1 text-[10px] mt-1" style={{ color: "rgba(166,179,194,0.6)" }}>
            <IconClock size={9} /> {node.duration} min
          </span>
        )}
        {node.status === "current" && <AiHintButton />}
      </div>
    </div>
  );
}

function UnitSection({ unit, onOpen }: { unit: UnitData; onOpen: (id: string) => void }) {
  const completedCount = unit.nodes.filter((n) => n.status === "completed").length;
  const totalCount     = unit.nodes.length;
  const pct            = Math.round((completedCount / totalCount) * 100);
  const hasCurrent     = unit.nodes.some((n) => n.status === "current");
  const allLocked      = unit.nodes.every((n) => n.status === "locked");

  return (
    <div className={cn("relative", allLocked && "opacity-50")}>
      <div className="flex items-center gap-3 mb-2">
        <div
          className={cn(
            "h-8 px-3 rounded-lg flex items-center gap-2 text-[12px] font-bold border",
            pct === 100 ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400" : ""
          )}
          style={
            hasCurrent
              ? { backgroundColor: "rgba(46,211,198,0.15)", color: "var(--color-success)", borderColor: "rgba(46,211,198,0.25)" }
              : pct !== 100
                ? { backgroundColor: "var(--color-primary-soft)", borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }
                : {}
          }
        >
          {pct === 100 && <IconCheck size={10} />}
          {unit.title}
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", unit.level === "B1" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : unit.level === "B2" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-violet-500/10 border-violet-500/20 text-violet-400")}>
          {unit.level}
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        <span className="text-[11px]" style={{ color: "rgba(166,179,194,0.6)" }}>{completedCount}/{totalCount}</span>
      </div>

      {unit.description && (
        <p className="text-[12px] text-center mb-6" style={{ color: "rgba(166,179,194,0.5)" }}>{unit.description}</p>
      )}

      <div className="mx-auto max-w-[200px] mb-6">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-border)" }}>
          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: pct === 100 ? "#10B981" : "linear-gradient(90deg, var(--color-success), var(--color-accent))" }} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        {unit.nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            {i > 0 && (
              <div
                className="w-0.5 h-6 -mt-6 mb-0 rounded-full"
                style={{
                  backgroundColor: node.status === "locked" ? "var(--color-border)" : "rgba(46,211,198,0.3)",
                  transform: `translateX(${(ZIGZAG[i % ZIGZAG.length] + ZIGZAG[(i - 1) % ZIGZAG.length]) / 2}px)`,
                }}
              />
            )}
            <PathNodeItem node={node} index={i} onOpen={onOpen} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LOADING SKELETON
   ════════════════════════════════════════════════════════════ */
function PathLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(46,211,198,0.3)", borderTopColor: "var(--color-success)" }} />
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Loading learning path…</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN
   ════════════════════════════════════════════════════════════ */
export default function LessonsPage({ apiLessons = [] }: { apiLessons?: ApiLesson[] }) {
  const [levelFilter, setLevelFilter] = useState("All");
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  const userId = useGuestUser();
  const { progress, refresh } = useProgress(userId);
  const stats = useUserStats(progress, apiLessons);

  const missions = useMemo(
    () => computeDailyMissions(progress, apiLessons),
    [progress, apiLessons]
  );

  const completedIds = useMemo(
    () => new Set(progress.filter((p) => p.completed).map((p) => p.lessonId)),
    [progress]
  );

  const { units, loading, error } = useCourses(completedIds);

  const filteredUnits = levelFilter === "All"
    ? units
    : units.filter((u) => u.level === levelFilter);

  return (
    <div className="max-w-[600px] mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-[18px] font-sora font-bold" style={{ color: "var(--color-text)" }}>Learning Path</h2>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Your personalized English journey</p>
        </div>
        <LevelFilter active={levelFilter} onChange={setLevelFilter} />
      </div>

      {/* Daily Mission */}
      <DailyMission missions={missions} />

      {/* Streak + Skill XP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
        <StreakMilestones streak={stats.streak} />
        <SkillXpCard totalXp={stats.totalXp} />
      </div>

      {/* Path divider */}
      <div className="flex items-center gap-3 mt-8 mb-6">
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
        <span className="text-[11px] font-bold uppercase tracking-[1.5px] flex items-center gap-2" style={{ color: "rgba(166,179,194,0.5)" }}>
          <span>{"\u{1F9ED}"}</span> Learning Path
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "var(--color-border)" }} />
      </div>

      {/* Units — loading / error / real data */}
      {loading ? (
        <PathLoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Could not load learning path.</p>
          <p className="text-xs" style={{ color: "rgba(166,179,194,0.5)" }}>{error}</p>
        </div>
      ) : filteredUnits.length > 0 ? (
        <div className="flex flex-col gap-14">
          {filteredUnits.map((unit) => (
            <UnitSection key={unit.id} unit={unit} onOpen={setOpenLessonId} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>No units available for {levelFilter}</p>
        </div>
      )}

      {/* Bottom progress */}
      <div className="mt-10 mb-4">
        <ProgressBar level={stats.level} xp={stats.xp} xpToNext={stats.xpToNext} />
      </div>

      {/* Lesson modal */}
      {openLessonId && userId && (
        <LessonModal
          lessonId={openLessonId}
          userId={userId}
          onClose={() => setOpenLessonId(null)}
          onComplete={() => {
            refresh();
          }}
        />
      )}
    </div>
  );
}
