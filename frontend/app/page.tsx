"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import BottomNav from "@/components/BottomNav";
import StartSpeakingCard from "@/components/StartSpeakingCard";
import PracticeScenarios from "@/components/PracticeScenarios";
import CoachTipCard from "@/components/CoachTipCard";
import TodayFocusCard from "@/components/TodayFocusCard";
import LessonsPage from "@/components/LessonsPage";
import LessonsSection from "@/components/LessonsSection";
import ScenarioList from "@/components/ScenarioList";
import ScenarioConversation from "@/components/ScenarioConversation";
import IeltsConversation from "@/components/IeltsConversation";
import SpeakingMetrics from "@/components/SpeakingMetrics";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useProgress } from "@/hooks/useProgress";
import { useLessons } from "@/hooks/useLessons";
import { useUserStats } from "@/hooks/useUserStats";
import { useGamification } from "@/hooks/useGamification";
import { useSpeakingMetrics } from "@/hooks/useSpeakingMetrics";
import { useTodayFocus }      from "@/hooks/useTodayFocus";
import { getScenarios } from "@/lib/api";
import type { Scenario, FocusRecommendation } from "@/lib/types";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("home");
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [ieltsScenario, setIeltsScenario] = useState<Scenario | null>(null);

  const userId = useCurrentUserId();
  const { progress } = useProgress(userId);
  const { apiLessons } = useLessons();
  const stats = useUserStats(progress, apiLessons);
  const { data: gamification, refetch: refetchGamification } = useGamification(userId);
  const { data: metrics, loading: metricsLoading } = useSpeakingMetrics(userId);
  const { recommendations: focusRecs, loading: focusLoading } = useTodayFocus(userId);

  const displayStreak = gamification?.streak.currentStreak ?? stats.streak;

  const handleStartSpeaking = () => {
    setActiveTab("speak");
  };

  const handleScenarioSelect = (scenarioOrId: Scenario | string) => {
    if (typeof scenarioOrId === "string") {
      // From homepage PracticeScenarios — switch to speak tab
      setActiveTab("speak");
    } else if (scenarioOrId.exam_type === "ielts") {
      // IELTS scenario — open dedicated IELTS conversation UI
      setIeltsScenario(scenarioOrId);
    } else {
      // Regular scenario — open standard conversation
      setActiveScenario(scenarioOrId);
    }
  };

  const handleConversationClose = () => {
    setActiveScenario(null);
  };

  const handleConversationComplete = () => {
    refetchGamification();
  };

  // Coach card action — deep-link to specific scenario when possible, else navigate to tab
  const handleFocusAction = async (rec: FocusRecommendation) => {
    // Deep-link: open a specific scenario conversation directly
    if (rec.scenarioId && rec.actionTarget === "speak") {
      try {
        const scenarios = await getScenarios();
        const match = scenarios.find((s) => s.id === rec.scenarioId);
        if (match) {
          handleScenarioSelect(match);
          return;
        }
      } catch {
        // Fall through to tab navigation on any fetch error
      }
    }

    // Default: navigate to the target tab
    setActiveTab(rec.actionTarget);
  };

  // Full-screen IELTS overlay
  if (ieltsScenario) {
    return (
      <IeltsConversation
        scenario={ieltsScenario}
        onClose={() => { setIeltsScenario(null); }}
        onComplete={handleConversationComplete}
      />
    );
  }

  // Full-screen regular scenario overlay
  if (activeScenario) {
    return (
      <ScenarioConversation
        scenario={activeScenario}
        onClose={handleConversationClose}
        onComplete={handleConversationComplete}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ backgroundColor: "var(--color-bg)" }}>
      <Topbar streak={displayStreak} />

      {/* Scroll area — account for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-lg mx-auto px-4 py-5">

          {/* ── HOME TAB ── */}
          {activeTab === "home" && (
            <div className="flex flex-col gap-5">
              <StartSpeakingCard onStart={handleStartSpeaking} />
              <TodayFocusCard
                recommendations={focusRecs}
                loading={focusLoading}
                onAction={handleFocusAction}
              />
              <PracticeScenarios onSelect={(id) => handleScenarioSelect(id)} />
              <CoachTipCard />
            </div>
          )}

          {/* ── SPEAK TAB — Scenario browser ── */}
          {activeTab === "speak" && (
            <ScenarioList onSelect={(scenario) => handleScenarioSelect(scenario)} />
          )}

          {/* ── PRACTICE TAB — Lesson-based practice ── */}
          {activeTab === "practice" && (
            <div className="space-y-4">
              <LessonsSection onLessonComplete={refetchGamification} />
              <LessonsPage apiLessons={apiLessons} />
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="flex flex-col gap-6">
              <SpeakingMetrics
                data={metrics ?? {
                  trend: [],
                  totalAttempts: 0,
                  averageScore: 0,
                  bestScore: 0,
                  recentScore: null,
                }}
                loading={metricsLoading}
              />
            </div>
          )}

        </div>
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}
