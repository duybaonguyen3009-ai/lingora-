"use client";

import AnimatedBackground from "@/components/AnimatedBackground";
import Topbar from "@/components/Topbar";
import FriendsShell from "@/components/Friends/FriendsShell";
import { useAppData } from "@/contexts/AppDataContext";

export default function FriendsRoomsPage() {
  const { displayStreak } = useAppData();
  return (
    <div className="min-h-dvh relative">
      <AnimatedBackground variant="subtle" />
      <div className="lg:hidden"><Topbar streak={displayStreak} /></div>
      <div className="mx-auto px-5 py-6 max-w-2xl lg:max-w-4xl animate-fadeSlideUp">
        <FriendsShell activeSubTab="rooms" />
      </div>
    </div>
  );
}
