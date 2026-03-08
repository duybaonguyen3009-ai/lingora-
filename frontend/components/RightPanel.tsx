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
    <div className="rounded-[16px] p-5 bg-[#0B2239] border border-white/[0.07]">
      <div className="flex items-center gap-2 mb-4 font-sora font-bold text-[14px]">
        <div className="w-6 h-6 rounded-[7px] flex items-center justify-center bg-[#2ED3C6]/10 text-[#2ED3C6]">
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
            <span className="font-sora font-black text-[19px] text-[#2ED3C6] leading-none">{progress}%</span>
            <span className="text-[8.5px] text-[#A6B3C2] mt-0.5 tracking-[0.3px]">of daily goal</span>
          </div>
        </div>

        <div>
          <p className="text-[12.5px] text-[#A6B3C2]">
            <strong className="text-[#E6EDF3] font-semibold">20 / 30 min</strong> studied today
          </p>
          <p className="text-[11.5px] text-[#A6B3C2] mt-1">10 more minutes to hit your goal!</p>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-2">
        {mockGoalTasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[12.5px]">
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]",
              task.done
                ? "bg-[#2ED3C6]/15 text-[#2ED3C6]"
                : "bg-white/[0.05] border border-white/[0.12] text-[#A6B3C2]"
            )}>
              {task.done && <IconCheck />}
            </div>
            <span className={task.done ? "text-[#A6B3C2] line-through" : "text-[#E6EDF3]"}>
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
    <div className="rounded-[16px] p-5 bg-[#0B2239] border border-white/[0.07]">
      <div className="flex items-center gap-2 mb-4 font-sora font-bold text-[14px]">
        <div className="w-6 h-6 rounded-[7px] flex items-center justify-center bg-[#2DA8FF]/10 text-[#2DA8FF]">
          <IconBarChart size={13} />
        </div>
        Skill Progress
      </div>

      <div className="flex flex-col gap-3">
        {mockSkills.map((skill, i) => (
          <div key={skill.name} className="flex items-center gap-2.5">
            <span className="text-[12.5px] text-[#A6B3C2] w-[76px] flex-shrink-0">{skill.name}</span>
            <div className="flex-1 h-[6px] bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full bg-gradient-to-r", skill.color)}
                style={{
                  width: loaded ? `${skill.value}%` : "0%",
                  transition: `width 1.3s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
                }}
              />
            </div>
            <span className="font-sora text-[11.5px] font-bold text-[#E6EDF3] w-[30px] text-right">
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
    <div className="rounded-[16px] p-5 bg-[#0B2239] border border-white/[0.07]">
      <div className="flex items-center gap-2 mb-4 font-sora font-bold text-[14px]">
        <div className="w-6 h-6 rounded-[7px] flex items-center justify-center bg-[#2ED3C6]/10 text-[#2ED3C6]">
          <IconCalendar />
        </div>
        Study Activity
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-[9px] text-[#A6B3C2]/60 text-center">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-1">
        {mockHeatmap.map((day, i) => (
          <div
            key={i}
            className="aspect-square rounded-[4px] cursor-pointer transition-all duration-200 hover:opacity-80 hover:scale-110"
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
      <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-[#A6B3C2]">
        <span>Less</span>
        <div className="flex gap-[3px]">
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className="w-[10px] h-[10px] rounded-[2px]" style={{ backgroundColor: HEATMAP_BG[l] }} />
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
