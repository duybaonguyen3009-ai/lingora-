"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mockSkills, mockGoalTasks, mockHeatmap } from "@/lib/mockData";
import { IconClock, IconBarChart, IconCalendar, IconCheck } from "./Icons";

// ─── DAILY GOAL ────────────────────────────────────────────────────────────
const GOAL_CIRCUMFERENCE = 213; // 2π * 34
const GOAL_PROGRESS = 67;

function DailyGoal() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setProgress(GOAL_PROGRESS), 400);
    return () => clearTimeout(t);
  }, []);

  const offset = GOAL_CIRCUMFERENCE - (progress / 100) * GOAL_CIRCUMFERENCE;

  return (
    <div className="rounded-lg p-5 border border-white/[0.07]" style={{ background: "var(--color-bg-card)" }}>
      <div className="flex items-center gap-2 mb-4 font-sora font-bold text-sm">
        <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-teal) 10%, transparent)", color: "var(--color-teal)" }}>
          <IconClock size={13} />
        </div>
        Daily Goal
      </div>

      {/* Ring + info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
            <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke="url(#goalRingGrad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={GOAL_CIRCUMFERENCE}
              strokeDashoffset={offset}
              style={{
                transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)",
                filter: "drop-shadow(0 0 5px rgba(46,211,198,0.4))",
              }}
            />
            <defs>
              <linearGradient id="goalRingGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#2ED3C6" />
                <stop offset="100%" stopColor="#2DA8FF" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-sora font-black text-lg leading-none" style={{ color: "var(--color-teal)" }}>{progress}%</span>
            <span className="text-xs mt-0.5 tracking-[0.3px]" style={{ color: "var(--color-text-muted)" }}>of daily goal</span>
          </div>
        </div>

        <div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            <strong className="font-semibold" style={{ color: "var(--color-text)" }}>20 / 30 min</strong> studied today
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>10 more minutes to hit your goal!</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2">
        {mockGoalTasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs">
            <div
              className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs",
                !task.done && "bg-white/[0.05] border border-white/[0.12]"
              )}
              style={task.done
                ? { background: "color-mix(in srgb, var(--color-teal) 15%, transparent)", color: "var(--color-teal)" }
                : { color: "var(--color-text-muted)" }
              }
            >
              {task.done && <IconCheck />}
            </div>
            <span style={{ color: task.done ? "var(--color-text-muted)" : "var(--color-text)" }} className={task.done ? "line-through" : ""}>
              {task.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SKILL PROGRESS ────────────────────────────────────────────────────────
function SkillProgress() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="rounded-lg p-5 border border-white/[0.07]" style={{ background: "var(--color-bg-card)" }}>
      <div className="flex items-center gap-2 mb-4 font-sora font-bold text-sm">
        <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-accent) 10%, transparent)", color: "var(--color-accent)" }}>
          <IconBarChart size={13} />
        </div>
        Skill Progress
      </div>

      <div className="flex flex-col gap-3">
        {mockSkills.map((skill, i) => (
          <div key={skill.name} className="flex items-center gap-2.5">
            <span className="text-xs w-[76px] flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{skill.name}</span>
            <div className="flex-1 h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", skill.color)}
                style={{
                  width: loaded ? `${skill.value}%` : "0%",
                  transition: `width 1.3s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
                }}
              />
            </div>
            <span className="font-sora text-xs font-bold w-[30px] text-right" style={{ color: "var(--color-text)" }}>
              {skill.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STUDY HEATMAP ─────────────────────────────────────────────────────────
const HEATMAP_BG: Record<number, string> = {
  0: "rgba(255,255,255,0.04)",
  1: "rgba(46,211,198,0.2)",
  2: "rgba(46,211,198,0.4)",
  3: "rgba(46,211,198,0.65)",
  4: "rgba(46,211,198,0.9)",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function StudyCalendar() {
  return (
    <div className="rounded-lg p-5 border border-white/[0.07]" style={{ background: "var(--color-bg-card)" }}>
      <div className="flex items-center gap-2 mb-4 font-sora font-bold text-sm">
        <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: "color-mix(in srgb, var(--color-teal) 10%, transparent)", color: "var(--color-teal)" }}>
          <IconCalendar />
        </div>
        Study Activity
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-xs text-center" style={{ color: "color-mix(in srgb, var(--color-text-muted) 60%, transparent)" }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {mockHeatmap.map((day, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm cursor-pointer transition duration-normal hover:opacity-80 hover:scale-110"
            style={{
              backgroundColor: HEATMAP_BG[day.level],
              outline: day.isToday ? "1.5px solid #2ED3C6" : undefined,
              outlineOffset: day.isToday ? "1px" : undefined,
            }}
            title={day.isToday ? "Today" : `Level ${day.level}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className="w-[10px] h-[10px] rounded-sm" style={{ backgroundColor: HEATMAP_BG[l] }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// ─── COMBINED RIGHT PANEL ──────────────────────────────────────────────────
export default function RightPanel() {
  return (
    <aside className="flex flex-col gap-4">
      <DailyGoal />
      <SkillProgress />
      <StudyCalendar />
    </aside>
  );
}
