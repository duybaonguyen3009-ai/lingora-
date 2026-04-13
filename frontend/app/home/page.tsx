"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import AppShell from "@/components/AppShell";
import Topbar from "@/components/Topbar";
import AnimatedBackground from "@/components/AnimatedBackground";
import HomeDashboard from "@/components/HomeDashboard";

const GrammarTab = dynamic(() => import("@/components/Grammar").then(m => ({ default: m.GrammarTab })), { ssr: false });
const ScenarioConversation = dynamic(() => import("@/components/ScenarioConversation"), { ssr: false });
const IeltsConversationV2 = dynamic(() => import("@/components/IeltsConversationV2"), { ssr: false });
const ExamScreen = dynamic(() => import("@/components/ExamScreen"), { ssr: false });
const WritingTab = dynamic(() => import("@/components/Writing/WritingTab"), { ssr: false });
const ReadingTab = dynamic(() => import("@/components/Reading/ReadingTab"), { ssr: false });
const BattleTab = dynamic(() => import("@/components/Battle/BattleTab"), { ssr: false });
const FriendsTab = dynamic(() => import("@/components/Social/FriendsTab"), { ssr: false });
const ProfileScreen = dynamic(() => import("@/components/ProfileScreen"), { ssr: false });
const SettingsScreen = dynamic(() => import("@/components/SettingsScreen"), { ssr: false });
const Onboarding = dynamic(() => import("@/components/Onboarding"), { ssr: false });
const OnboardingFlow = dynamic(() => import("@/components/Onboarding/OnboardingFlow"), { ssr: false });
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useProgress } from "@/hooks/useProgress";
import { useLessons } from "@/hooks/useLessons";
import { useUserStats } from "@/hooks/useUserStats";
import { useGamification } from "@/hooks/useGamification";
import { useSpeakingMetrics } from "@/hooks/useSpeakingMetrics";
import { useTodayFocus } from "@/hooks/useTodayFocus";
import { useAuthStore } from "@/lib/stores/authStore";
import { getScenarios, getOnboardingStatus, getBattleHome } from "@/lib/api";
import type { Scenario, FocusRecommendation, BattleRankTier } from "@/lib/types";

export default function AppHomePage() {
  return (
    <Suspense>
      <AppHomeContent />
    </Suspense>
  );
}

/**
 * Map sidebar "learn-*" sub-skill IDs to the tab content they should display.
 * "learn-speaking" and "exam" both route to ExamScreen.
 */
function resolveContentTab(activeTab: string): string {
  switch (activeTab) {
    case "learn":
    case "learn-speaking":
    case "exam":
      return "exam";
    case "learn-grammar":
      return "grammar";
    case "learn-reading":
      return "reading";
    case "learn-writing":
      return "writing";
    case "learn-listening":
      return "listening";
    default:
      return activeTab;
  }
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
  const [readingActive, setReadingActive] = useState(false);
  const [grammarOverlayOpen, setGrammarOverlayOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [rankTier, setRankTier] = useState<BattleRankTier>("iron");

  const userId = useCurrentUserId();
  const { progress } = useProgress(userId);
  const { apiLessons } = useLessons();
  const stats = useUserStats(progress, apiLessons);
  const { data: gamification, refetch: refetchGamification } = useGamification(userId);
  const { data: metrics, loading: metricsLoading } = useSpeakingMetrics(userId);
  const { recommendations: focusRecs, loading: focusLoading } = useTodayFocus(userId);

  const displayStreak = gamification?.streak.currentStreak ?? stats.streak;

  // Fetch battle rank tier for sidebar display
  useEffect(() => {
    if (!user) return;
    getBattleHome()
      .then((home) => {
        if (home?.profile?.current_rank_tier) {
          setRankTier(home.profile.current_rank_tier);
        }
      })
      .catch(() => {});
  }, [user]);

  // Check onboarding status on mount
  useEffect(() => {
    if (!user || onboardingChecked) return;
    getOnboardingStatus()
      .then((status) => {
        if (!status.has_completed_onboarding) setShowOnboarding(true);
      })
      .catch(() => {})
      .finally(() => setOnboardingChecked(true));
  }, [user, onboardingChecked]);

  const handleStartSpeaking = () => setActiveTab("exam");

  const handleScenarioSelect = (scenarioOrId: Scenario | string) => {
    if (typeof scenarioOrId === "string") {
      setActiveTab("exam");
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

  /**
   * Handle tab changes from both sidebar and bottom nav.
   * Sidebar sends "learn-speaking", "learn-grammar" etc.
   * BottomNav sends "home", "exam", "battle", "social", "profile".
   */
  const handleTabChange = useCallback((id: string) => {
    // If sidebar sends "learn-writing", activate the writing overlay
    if (id === "learn-writing") {
      setWritingActive(true);
      setReadingActive(false);
      setActiveTab(id);
      return;
    }
    if (id === "learn-reading") {
      setReadingActive(true);
      setWritingActive(false);
      setActiveTab(id);
      return;
    }
    // Close writing/reading overlays when navigating away
    setWritingActive(false);
    setReadingActive(false);
    setActiveTab(id);
  }, []);

  if (authLoading || !user) return null;

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  // Full-screen overlays — render outside AppShell
  if (readingActive) {
    return <ReadingTab onClose={() => { setReadingActive(false); setActiveTab("home"); }} />;
  }
  if (writingActive) {
    return <WritingTab onClose={() => { setWritingActive(false); setActiveTab("home"); }} />;
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

  const contentTab = resolveContentTab(activeTab);

  const bgClass =
    contentTab === "home" ? "bg-home" :
    contentTab === "exam" ? "bg-exam" :
    contentTab === "battle" ? "" :
    "";

  const blobVariant: "expressive" | "subtle" | "minimal" | "none" =
    contentTab === "home" ? "expressive" :
    contentTab === "exam" ? "minimal" :
    contentTab === "battle" ? "none" :
    "subtle";

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      gamification={gamification}
      rankTier={rankTier}
      userName={user.name}
      hideNav={grammarOverlayOpen}
    >
      <div className={`min-h-dvh relative ${bgClass}`}>
        <AnimatedBackground variant={blobVariant} centerGlow={contentTab === "home"} />

        {/* Topbar — mobile only (sidebar replaces it on desktop) */}
        <div className="lg:hidden">
          {!grammarOverlayOpen && <Topbar streak={displayStreak} />}
        </div>

        <div className={`mx-auto px-5 py-6 ${contentTab === "home" ? "max-w-5xl" : contentTab === "practice" ? "max-w-xl lg:max-w-3xl xl:max-w-5xl" : "max-w-2xl lg:max-w-4xl"}`}>
          {contentTab === "home" && (
            <HomeDashboard
              userName={user.name}
              gamification={gamification}
              focusRecs={focusRecs}
              focusLoading={focusLoading}
              rankTier={rankTier}
              onNavigate={handleTabChange}
              onFocusAction={handleFocusAction}
            />
          )}
          {contentTab === "exam" && (
            <div className="animate-fadeSlideUp">
              <ExamScreen onStartIelts={(scenario) => setIeltsScenario(scenario)} onStartWriting={() => setWritingActive(true)} onStartReading={() => setReadingActive(true)} onScenarioSelect={handleScenarioSelect} />
            </div>
          )}
          {contentTab === "grammar" && (
            <div className="animate-fadeSlideUp">
              <GrammarTab onOverlayChange={setGrammarOverlayOpen} />
            </div>
          )}
          {contentTab === "listening" && (
            <div className="animate-fadeSlideUp">
              <div className="text-center py-20">
                <div className="text-4xl mb-4">🎧</div>
                <h2 className="text-xl font-display font-bold mb-2" style={{ color: "var(--color-text)" }}>
                  Listening Practice
                </h2>
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  Coming soon — practice IELTS listening with AI-scored comprehension
                </p>
              </div>
            </div>
          )}
          {contentTab === "battle" && (
            <div className="animate-fadeSlideUp">
              <BattleTab />
            </div>
          )}
          {contentTab === "social" && (
            <div className="animate-fadeSlideUp">
              <FriendsTab />
            </div>
          )}
          {contentTab === "profile" && (
            <div className="animate-fadeSlideUp">
              <ProfileScreen userId={userId} metrics={metrics} metricsLoading={metricsLoading} gamification={gamification} />
            </div>
          )}
          {contentTab === "settings" && (
            <div className="animate-fadeSlideUp">
              <SettingsScreen />
            </div>
          )}
        </div>
      </div>

      <Onboarding />
    </AppShell>
  );
}
