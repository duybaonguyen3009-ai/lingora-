"use client";

import { useState } from "react";
import Topbar from "@/components/Topbar";
import BottomNav from "@/components/BottomNav";
import StartSpeakingCard from "@/components/StartSpeakingCard";
import PracticeScenarios from "@/components/PracticeScenarios";
import CoachTipCard from "@/components/CoachTipCard";
import TodayFocusCard from "@/components/TodayFocusCard";
import { GrammarTab } from "@/components/Grammar";
import ScenarioList from "@/components/ScenarioList";
import ScenarioConversation from "@/components/ScenarioConversation";
import IeltsConversation from "@/components/IeltsConversation";
import ExamScreen from "@/components/ExamScreen";
import ProfileScreen from "@/components/ProfileScreen";
import AnimatedBackground from "@/components/AnimatedBackground";
import Onboarding from "@/components/Onboarding";
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
      setActiveTab("speak");
    } else if (scenarioOrId.exam_type === "ielts") {
      setIeltsScenario(scenarioOrId);
    } else {
      setActiveScenario(scenarioOrId);
    }
  };

  const handleConversationClose = () => {
    setActiveScenario(null);
  };

  const handleConversationComplete = () => {
    refetchGamification();
  };

  const handleFocusAction = async (rec: FocusRecommendation) => {
    if (rec.scenarioId && rec.actionTarget === "speak") {
      try {
        const scenarios = await getScenarios();
        const match = scenarios.find((s) => s.id === rec.scenarioId);
        if (match) {
          handleScenarioSelect(match);
          return;
        }
      } catch {
        // Fall through to tab navigation
      }
    }
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

  const bgClass =
    activeTab === "home" ? "bg-home" :
    activeTab === "speak" ? "bg-speak" :
    activeTab === "exam" ? "bg-exam" :
    activeTab === "practice" ? "bg-practice" : "";

  const blobVariant: "expressive" | "subtle" | "minimal" | "none" =
    activeTab === "home" ? "expressive" :
    activeTab === "speak" ? "subtle" :
    activeTab === "exam" ? "minimal" :
    activeTab === "practice" ? "subtle" : "none";

  return (
    <div className={`flex flex-col min-h-dvh ${bgClass} relative`} style={{ backgroundColor: "var(--color-bg)" }}>
      <AnimatedBackground
        variant={blobVariant}
        centerGlow={activeTab === "home" || activeTab === "speak"}
      />
      <Topbar streak={displayStreak} />

      <main className="flex-1 overflow-y-auto pb-24 relative z-10">
        <div className="max-w-xl mx-auto px-5 py-6">

          {/* ── HOME TAB ── */}
          {activeTab === "home" && (
            <div className="flex flex-col gap-8 animate-fadeSlideUp">
              {/* Primary CTA — dominant, above the fold */}
              <StartSpeakingCard onStart={handleStartSpeaking} />

              {/* Secondary — personalized recommendations (only if relevant) */}
              <TodayFocusCard
                recommendations={focusRecs}
                loading={focusLoading}
                onAction={handleFocusAction}
              />

              {/* Tertiary — browsable options */}
              <PracticeScenarios onSelect={(id) => handleScenarioSelect(id)} />

              {/* Ambient — non-blocking, dismissible */}
              <CoachTipCard />
            </div>
          )}

          {/* ── SPEAK TAB — Scenario browser (no exam scenarios) ── */}
          {activeTab === "speak" && (
            <div className="animate-fadeSlideUp">
              <ScenarioList
                onSelect={(scenario) => handleScenarioSelect(scenario)}
                excludeExam
              />
            </div>
          )}

          {/* ── GRAMMAR TAB — Gamified tenses curriculum ── */}
          {activeTab === "practice" && (
            <div className="animate-fadeSlideUp">
              <GrammarTab />
            </div>
          )}

          {/* ── EXAM TAB ── */}
          {activeTab === "exam" && (
            <div className="animate-fadeSlideUp">
              <ExamScreen
                onStartIelts={(scenario) => setIeltsScenario(scenario)}
              />
            </div>
          )}

          {/* ── PROFILE TAB ── */}
          {activeTab === "profile" && (
            <div className="animate-fadeSlideUp">
              <ProfileScreen
                userId={userId}
                metrics={metrics}
                metricsLoading={metricsLoading}
                gamification={gamification}
              />
            </div>
          )}

        </div>
      </main>

      <BottomNav active={activeTab} onChange={setActiveTab} />
      <Onboarding />
    </div>
  );
}
