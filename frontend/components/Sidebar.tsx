"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import LingonaLogo from "./LingonaLogo";
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
        "border-r border-white/[0.07]",
        "sidebar-transition overflow-y-hidden overflow-x-visible",
        collapsed ? "w-[72px]" : "w-[240px]"
      )}
      style={{ background: "var(--color-bg-card)" }}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        aria-label="Toggle sidebar"
        className={cn(
          "absolute top-5 -right-3 z-[999]",
          "w-6 h-6 rounded-full flex items-center justify-center",
          "border border-white/10",
          "shadow-md",
          "transition-all duration-normal",
          "hover:bg-emerald-400 hover:border-emerald-400 hover:text-gray-900"
        )}
        style={{ background: "var(--color-bg-secondary)", color: "var(--color-text-muted)" }}
      >
        <span className={cn("transition-transform duration-normal", collapsed && "rotate-180")}>
          <IconChevronLeft />
        </span>
      </button>

      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4 border-b border-white/[0.07] min-h-[72px] flex-shrink-0">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
          <LingonaLogo size={40} />
        </div>
        <div
          className={cn(
            "overflow-hidden transition-all duration-normal",
            collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
          )}
        >
          <div
            className="font-sora font-black text-lg tracking-[-0.3px] whitespace-nowrap"
            style={{
              background: "linear-gradient(135deg, #fff 40%, #2ED3C6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            LINGONA
          </div>
          <div className="text-xs tracking-[1px] uppercase mt-px whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
            Learn English The Intelligent Way
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
        {NAV_ITEMS.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;

          return (
            <div key={item.id}>
              {showSection && (
                <div
                  className={cn(
                    "text-xs font-semibold uppercase tracking-[1.2px]",
                    "px-2 mb-1.5 mt-4 whitespace-nowrap overflow-hidden",
                    "transition-opacity duration-normal",
                    collapsed && "opacity-0"
                  )}
                  style={{ color: "color-mix(in srgb, var(--color-text-muted) 60%, transparent)" }}
                >
                  {item.section}
                </div>
              )}
              <button
                onClick={() => onNavChange(item.id)}
                className={cn(
                  "relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-md mb-0.5",
                  "text-left whitespace-nowrap overflow-hidden",
                  "transition-all duration-normal group",
                  activeNav !== item.id && "hover:bg-white/5"
                )}
                style={activeNav === item.id
                  ? { background: "color-mix(in srgb, var(--color-teal) 10%, transparent)", color: "var(--color-teal)" }
                  : { color: "var(--color-text-muted)" }
                }
                onMouseEnter={(e) => {
                  if (activeNav !== item.id) e.currentTarget.style.color = "var(--color-text)";
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== item.id) e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                {/* Active indicator */}
                {activeNav === item.id && (
                  <span
                    className="absolute left-0 w-[3px] h-5 rounded-r-[3px]"
                    style={{ background: "var(--color-teal)", boxShadow: "0 0 8px var(--color-teal)" }}
                  />
                )}

                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </span>

                <span
                  className={cn(
                    "text-sm font-medium transition-opacity duration-normal",
                    collapsed ? "opacity-0" : "opacity-100"
                  )}
                >
                  {item.label}
                </span>

                {item.badge && !collapsed && (
                  <span className="ml-auto text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ background: "var(--color-teal)", color: "var(--color-text)" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 py-4 border-t border-white/[0.07] flex-shrink-0">
        <button className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-md mb-2.5 hover:bg-white/5 transition-all duration-normal whitespace-nowrap overflow-hidden" style={{ color: "var(--color-text-muted)" }}>
          <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <IconSettings />
          </span>
          <span className={cn("text-sm font-medium transition-opacity duration-normal", collapsed ? "opacity-0" : "opacity-100")}>
            Settings
          </span>
        </button>

        <button className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-md hover:bg-white/5 transition-all duration-normal overflow-hidden whitespace-nowrap">
          <div
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 font-sora font-bold text-xs"
            style={{ color: "var(--color-text)", background: "linear-gradient(135deg, var(--color-teal), var(--color-accent))", boxShadow: "0 0 0 2px rgba(46,211,198,0.3)" }}
          >
            {mockUser.initials}
          </div>
          <div className={cn("transition-opacity duration-normal overflow-hidden", collapsed ? "opacity-0 w-0" : "opacity-100")}>
            <div className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--color-text)" }}>{mockUser.name}</div>
            <div className="text-xs whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>{mockUser.level}</div>
          </div>
        </button>
      </div>
    </aside>
  );
}
