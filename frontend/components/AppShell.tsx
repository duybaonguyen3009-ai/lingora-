"use client";

import { useState, useEffect } from "react";
import AppSidebar from "./AppSidebar";
import BottomNav from "./BottomNav";
import type { GamificationData, BattleRankTier } from "@/lib/types";

interface AppShellProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (id: string) => void;
  gamification: GamificationData | null;
  rankTier?: BattleRankTier;
  userName?: string;
  /** Hide navigation entirely (used during overlays like grammar, onboarding) */
  hideNav?: boolean;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}

export default function AppShell({
  children,
  activeTab,
  onTabChange,
  gamification,
  rankTier,
  userName,
  hideNav = false,
}: AppShellProps) {
  const isDesktop = useIsDesktop();

  return (
    <div className="min-h-dvh relative bg-deep-gradient noise-overlay">
      {/* Desktop sidebar */}
      {!hideNav && isDesktop && (
        <AppSidebar
          active={activeTab}
          onChange={onTabChange}
          gamification={gamification}
          rankTier={rankTier}
          userName={userName}
        />
      )}

      {/* Main content */}
      <main
        className="min-h-dvh overflow-y-auto"
        style={{
          marginLeft: !hideNav && isDesktop ? "var(--sidebar-width)" : 0,
          paddingBottom: !hideNav && !isDesktop ? 68 : 0,
          transition: "margin-left 0.2s ease",
        }}
      >
        <div className="relative z-10">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      {!hideNav && !isDesktop && (
        <BottomNav active={activeTab} onChange={onTabChange} />
      )}
    </div>
  );
}
