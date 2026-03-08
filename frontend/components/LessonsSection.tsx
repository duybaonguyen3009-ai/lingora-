"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { mockLessons } from "@/lib/mockData";
import LessonCard from "./LessonCard";
import type { LessonStatus } from "@/lib/types";

type TabFilter = "all" | "recommended" | "completed";

const TABS: { id: TabFilter; label: string }[] = [
  { id: "all",         label: "All"         },
  { id: "recommended", label: "Recommended" },
  { id: "completed",   label: "Completed"   },
];

export default function LessonsSection() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filtered = mockLessons.filter((l) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return l.status === "completed";
    if (activeTab === "recommended") return l.status === "recommended";
    return true;
  });

  return (
    <section>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-sora font-bold text-[15.5px] tracking-[-0.2px]">Today's Lessons</h3>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-[3px] gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-[5px] rounded-[7px] text-[12px] font-medium",
                  "transition-all duration-200 whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-[#2ED3C6] text-[#071A2F] font-bold"
                    : "text-[#A6B3C2] hover:text-[#E6EDF3] hover:bg-white/[0.05]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button className="text-[12.5px] font-medium text-[#2ED3C6] hover:opacity-75 transition-opacity whitespace-nowrap">
            View all →
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.length > 0
          ? filtered.map((lesson, i) => (
              <LessonCard key={lesson.id} lesson={lesson} delay={i * 60} />
            ))
          : (
            <div className="col-span-2 py-10 text-center text-[#A6B3C2] text-sm">
              No lessons in this category yet.
            </div>
          )
        }
      </div>
    </section>
  );
}
