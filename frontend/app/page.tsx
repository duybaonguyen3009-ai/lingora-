"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Hero from "@/components/Hero";
import StatsRow from "@/components/StatsRow";
import LessonsSection from "@/components/LessonsSection";
import AiTutorCard from "@/components/AiTutorCard";
import WeeklyChallenge from "@/components/WeeklyChallenge";
import RightPanel from "@/components/RightPanel";
import LessonsPage from "@/components/LessonsPage";
import { useGuestUser } from "@/lib/guestUser";
import { useProgress } from "@/hooks/useProgress";
import { useUserStats } from "@/hooks/useUserStats";

const NAV_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  lessons: "Lessons",
  practice: "Practice",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  progress: "Progress",
};

export default function DashboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("dashboard");

  const userId = useGuestUser();
  const { progress } = useProgress(userId);
  const stats = useUserStats(progress);

  return (
    <div className="relative flex h-screen overflow-x-visible overflow-y-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "md:relative fixed inset-y-0 left-0 z-50",
          "transition-transform duration-200",
          "md:translate-x-0",
          "overflow-visible",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          activeNav={activeNav}
          onNavChange={(id) => {
            setActiveNav(id);
            setMobileOpen(false);
          }}
        />
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-y-hidden overflow-x-visible">
        <Topbar
          onMobileMenuOpen={() => setMobileOpen(true)}
          title={NAV_LABELS[activeNav] || "Dashboard"}
          streak={stats.streak}
          totalXp={stats.totalXp}
        />

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-6">
          <div className="max-w-[1400px] mx-auto">

            {/* ── DASHBOARD ── */}
            {activeNav === "dashboard" && (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
                <div className="flex flex-col gap-5 min-w-0">
                  <Hero />
                  <StatsRow streak={stats.streak} />
                  <LessonsSection />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <AiTutorCard />
                    <WeeklyChallenge />
                  </div>
                </div>
                <div className="xl:block">
                  <RightPanel />
                </div>
              </div>
            )}

            {/* ── LESSONS ── */}
            {activeNav === "lessons" && <LessonsPage />}

            {/* ── OTHER PAGES — placeholder ── */}
            {activeNav !== "dashboard" && activeNav !== "lessons" && (
              <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#2ED3C6]/10 border border-[#2ED3C6]/20 flex items-center justify-center">
                  <span className="text-[#2ED3C6] text-2xl font-bold">
                    {NAV_LABELS[activeNav]?.[0] || "?"}
                  </span>
                </div>
                <h2 className="text-xl font-sora font-bold text-[#E6EDF3]">
                  {NAV_LABELS[activeNav]}
                </h2>
                <p className="text-[#A6B3C2] text-sm">
                  This section is coming soon — stay tuned!
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
