"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  IconDashboard, IconBook, IconZap, IconPen, IconOpenBook,
  IconHeadphones, IconMic, IconBarChart, IconSettings, IconChevronLeft,
} from "./Icons";
import { mockUser } from "@/lib/mockData";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",  label: "Dashboard",  icon: <IconDashboard />, section: "Main" },
  { id: "lessons",    label: "Lessons",    icon: <IconBook />,       badge: 3 },
  { id: "practice",   label: "Practice",   icon: <IconZap /> },
  { id: "vocabulary", label: "Vocabulary", icon: <IconPen /> },
  { id: "reading",    label: "Reading",    icon: <IconOpenBook />,   section: "Skills" },
  { id: "listening",  label: "Listening",  icon: <IconHeadphones /> },
  { id: "speaking",   label: "Speaking",   icon: <IconMic /> },
  { id: "progress",   label: "Progress",   icon: <IconBarChart />,   section: "Analytics" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeNav: string;
  onNavChange: (id: string) => void;
}

export default function Sidebar({ collapsed, onToggle, activeNav, onNavChange }: SidebarProps) {
  let lastSection = "";

  return (
    <aside
      className={cn(
        "flex flex-col flex-shrink-0 relative z-[100]",
        "bg-[#0B2239] border-r border-white/[0.07]",
        "sidebar-transition overflow-y-hidden overflow-x-visible",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label="Toggle sidebar"
        className={cn(
          "absolute top-5 -right-3 z-[999]",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "bg-[#102A43] border border-white/10",
          "text-[#A6B3C2] shadow-md",
          "transition-all duration-200",
          "hover:bg-[#2ED3C6] hover:border-[#2ED3C6] hover:text-[#071A2F]"
        )}
      >
        <span className={cn("transition-transform duration-200", collapsed && "rotate-180")}>
          <IconChevronLeft />
        </span>
      </button>

      {/* Brand */}
      <div className="flex items-center gap-[10px] px-4 pt-5 pb-4 border-b border-white/[0.07] min-h-[72px] flex-shrink-0">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <Image
            src="/lingora-logo.png"
            alt="Lingora"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
          )}
        >
          <div
            className="font-sora font-black text-[18px] tracking-[-0.3px] whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #fff 40%, #2ED3C6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            LINGORA
          </div>
          <div className="text-[9px] text-[#A6B3C2] tracking-[1px] uppercase mt-[1px] whitespace-nowrap">
            Learn English The Intelligent Way
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-[10px] py-4">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.id}>
              {showSection && (
                <div
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[1.2px] text-[#A6B3C2]/60",
                    "px-2 mb-1.5 mt-4 whitespace-nowrap overflow-hidden",
                    "transition-opacity duration-200",
                    collapsed && "opacity-0"
                  )}
                >
                  {item.section}
                </div>
              )}
              <button
                onClick={() => onNavChange(item.id)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-[10px] py-[10px] rounded-[10px] mb-0.5",
                  "text-left whitespace-nowrap overflow-hidden",
                  "transition-all duration-200 group",
                  activeNav === item.id
                    ? "bg-[#2ED3C6]/10 text-[#2ED3C6]"
                    : "text-[#A6B3C2] hover:bg-white/5 hover:text-[#E6EDF3]"
                )}
              >
                {/* Active indicator */}
                {activeNav === item.id && (
                  <span
                    className="absolute left-0 w-[3px] h-5 bg-[#2ED3C6] rounded-r-[3px]"
                    style={{ boxShadow: "0 0 8px #2ED3C6" }}
                  />
                )}

                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </span>

                <span
                  className={cn(
                    "text-[13.5px] font-medium transition-opacity duration-200",
                    collapsed ? "opacity-0" : "opacity-100"
                  )}
                >
                  {item.label}
                </span>

                {item.badge && !collapsed && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-[10px] bg-[#2ED3C6] text-[#071A2F] flex-shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-[10px] py-4 border-t border-white/[0.07] flex-shrink-0">
        <button className="w-full flex items-center gap-3 px-[10px] py-[10px] rounded-[10px] mb-2.5 text-[#A6B3C2] hover:bg-white/5 hover:text-[#E6EDF3] transition-all duration-200 whitespace-nowrap overflow-hidden">
          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <IconSettings />
          </span>
          <span className={cn("text-[13.5px] font-medium transition-opacity duration-200", collapsed ? "opacity-0" : "opacity-100")}>
            Settings
          </span>
        </button>

        <button className="w-full flex items-center gap-[10px] px-[10px] py-[10px] rounded-[10px] hover:bg-white/5 transition-all duration-200 overflow-hidden whitespace-nowrap">
          <div
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 font-sora font-bold text-xs text-[#071A2F]"
            style={{ background: "linear-gradient(135deg, #2ED3C6, #2DA8FF)", boxShadow: "0 0 0 2px rgba(46,211,198,0.3)" }}
          >
            {mockUser.initials}
          </div>
          <div className={cn("transition-opacity duration-200 overflow-hidden", collapsed ? "opacity-0 w-0" : "opacity-100")}>
            <div className="text-[13px] font-semibold text-[#E6EDF3] whitespace-nowrap">{mockUser.name}</div>
            <div className="text-[11px] text-[#A6B3C2] whitespace-nowrap">{mockUser.level}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
