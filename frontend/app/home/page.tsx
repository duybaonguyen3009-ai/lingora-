"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Topbar from "@/components/Topbar";
import BottomNav from "@/components/BottomNav";
import StartSpeakingCard from "@/components/StartSpeakingCard";
import PracticeScenarios from "@/components/PracticeScenarios";
import CoachTipCard from "@/components/CoachTipCard";
import TodayFocusCard from "@/components/TodayFocusCard";
import AnimatedBackground from "@/components/AnimatedBackground";

const GrammarTab = dynamic(() => import("@/components/Grammar").then(m => ({ default: m.GrammarTab })), { ssr: false });
const ScenarioList = dynamic(() => import("@/components/ScenarioList"), { ssr: false });
const ScenarioConversation = dynamic(() => import("@/components/ScenarioConversation"), { ssr: false });
const IeltsConversationV2 = dynamic(() => import("@/components/IeltsConversationV2"), { ssr: false });
const ExamScreen = dynamic(() => import("@/components/ExamScreen"), { ssr: false });
const WritingTab = dynamic(() => import("@/components/Writing/WritingTab"), { ssr: false });
const ProfileScreen = dynamic(() => import("@/components/ProfileScreen"), { ssr: false });
const Onboarding = dynamic(() => import("@/components/Onboarding"), { ssr: false });
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useProgress } from "@/hooks/useProgress";
import { useLessons } from "@/hooks/useLessons";
import { useUserStats } from "@/hooks/useUserStats";
import { useGamification } from "@/hooks/useGamification";
import { useSpeakingMetrics } from "@/hooks/useSpeakingMetrics";
import { useTodayFocus } from "@/hooks/useTodayFocus";
import { useAuthStore } from "@/lib/stores/authStore";
import { getScenarios } from "@/lib/api";
import type { Scenario, FocusRecommendation } from "@/lib/types";

export default function AppHomePage() {
  return (
    <Suspense>
      <AppHomeContent />
    </Suspense>
  );
}

function AppHomeContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuthStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  const isExperimental = (() => {
    const urlParam = searchParams.get("experimental") === "true";
    if (typeof window !== "undefined") {
      if (urlParam) {
        sessionStorage.setItem("ielts_experimental", "true");
        return true;
      }
      return sessionStorage.getItem("ielts_experimental") === "true";
    }
    return urlParam;
  })();

  const [activeTab, setActiveTab] = useState("home");
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [ieltsScenario, setIeltsScenario] = useState<Scenario | null>(null);
  const [writingActive, setWritingActive] = useState(false);
  const [grammarOverlayOpen, setGrammarOverlayOpen] = useState(false);

  const userId = useCurrentUserId();
  const { progress } = useProgress(userId);
  const { apiLessons } = useLessons();
  const stats = useUserStats(progress, apiLessons);
  const { data: gamification, refetch: refetchGamification } = useGamification(userId);
  const { data: metrics, loading: metricsLoading } = useSpeakingMetrics(userId);
  const { recommendations: focusRecs, loading: focusLoading } = useTodayFocus(userId);

  const displayStreak = gamification?.streak.currentStreak ?? stats.streak;

  const handleStartSpeaking = () => setActiveTab("speak");

  const handleScenarioSelect = (scenarioOrId: Scenario | string) => {
    if (typeof scenarioOrId === "string") {
      setActiveTab("speak");
    } else if (scenarioOrId.exam_type === "ielts") {
      setIeltsScenario(scenarioOrId);
    } else {
      setActiveScenario(scenarioOrId);
    }
  };

  const handleConversationClose = () => setActiveScenario(null);
  const handleConversationComplete = () => refetchGamification();

  const handleFocusAction = async (rec: FocusRecommendation) => {
    if (rec.scenarioId && rec.actionTarget === "speak") {
      try {
        const scenarios = await getScenarios();
        const match = scenarios.find((s) => s.id === rec.scenarioId);
        if (match) { handleScenarioSelect(match); return; }
      } catch { /* Fall through */ }
    }
    setActiveTab(rec.actionTarget);
  };

  if (authLoading || !user) return null;

  if (writingActive) {
    return <WritingTab onClose={() => setWritingActive(false)} />;
  }

  if (ieltsScenario) {
    return (
      <IeltsConversationV2
        scenario={ieltsScenario}
        onClose={() => setIeltsScenario(null)}
        onComplete={handleConversationComplete}
      />
    );
  }

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
      <AnimatedBackground variant={blobVariant} centerGlow={activeTab === "home" || activeTab === "speak"} />
      {!grammarOverlayOpen && <Topbar streak={displayStreak} />}

      <main className="flex-1 overflow-y-auto pb-24">
        <div className={`mx-auto px-5 py-6 ${activeTab === "practice" ? "max-w-xl lg:max-w-3xl xl:max-w-5xl" : "max-w-xl"}`}>
          {activeTab === "home" && (
            <div className="flex flex-col gap-8 animate-fadeSlideUp">
              <StartSpeakingCard onStart={handleStartSpeaking} />
              <TodayFocusCard recommendations={focusRecs} loading={focusLoading} onAction={handleFocusAction} />
              <PracticeScenarios onSelect={(id) => handleScenarioSelect(id)} />
              <CoachTipCard />
            </div>
          )}
          {activeTab === "speak" && (
            <div className="animate-fadeSlideUp">
              <ScenarioList onSelect={(scenario) => handleScenarioSelect(scenario)} excludeExam />
            </div>
          )}
          {activeTab === "practice" && <GrammarTab onOverlayChange={setGrammarOverlayOpen} />}
          {activeTab === "exam" && (
            <div className="animate-fadeSlideUp">
              <ExamScreen onStartIelts={(scenario) => setIeltsScenario(scenario)} onStartWriting={() => setWritingActive(true)} />
            </div>
          )}
          {activeTab === "profile" && (
            <div className="animate-fadeSlideUp">
              <ProfileScreen userId={userId} metrics={metrics} metricsLoading={metricsLoading} gamification={gamification} />
            </div>
          )}
        </div>
      </main>

      {!grammarOverlayOpen && <BottomNav active={activeTab} onChange={setActiveTab} />}
      <Onboarding />
    </div>
  );
}
