"use client";

import { IconSearch, IconBell, IconFire, IconZap, IconMenu } from "./Icons";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mockData";

interface TopbarProps {
  onMobileMenuOpen: () => void;
  title?: string;
}

export default function Topbar({ onMobileMenuOpen, title = "Dashboard" }: TopbarProps) {
  return (
    <header className="h-16 px-7 flex items-center justify-between gap-4 border-b border-white/[0.07] bg-[#071A2F]/80 backdrop-blur-md flex-shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden w-9 h-9 rounded-[8px] flex items-center justify-center bg-white/[0.06] border border-white/[0.07] text-[#E6EDF3] hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <IconMenu />
        </button>

        <h1 className="font-sora font-bold text-[17px] tracking-[-0.2px]">{title}</h1>

        {/* Search */}
        <div className={cn(
          "hidden sm:flex items-center gap-2 h-9 px-[14px] rounded-[10px]",
          "bg-white/[0.05] border border-white/[0.07]",
          "focus-within:border-[#2ED3C6]/30 focus-within:bg-[#2ED3C6]/[0.05]",
          "transition-all duration-200 w-60 focus-within:w-72"
        )}>
          <IconSearch className="text-[#A6B3C2] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search lessons, words..."
            className="bg-transparent border-none outline-none text-[#E6EDF3] text-[13px] w-full placeholder:text-[#A6B3C2] font-sans"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Streak badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[12.5px] font-semibold cursor-pointer hover:bg-amber-500/15 transition-colors">
          <IconFire className="text-amber-400" />
          18 Day Streak
        </div>

        {/* XP badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[20px] bg-[#2ED3C6]/10 border border-[#2ED3C6]/20 text-[#2ED3C6] text-[12.5px] font-semibold cursor-pointer hover:bg-[#2ED3C6]/15 transition-colors">
          <IconZap size={13} className="text-[#2ED3C6]" />
          2,480 XP
        </div>

        {/* Notification bell */}
        <div className="relative w-9 h-9 rounded-[10px] flex items-center justify-center bg-white/[0.05] border border-white/[0.07] text-[#A6B3C2] cursor-pointer hover:bg-white/[0.09] hover:text-[#E6EDF3] transition-all duration-200">
          <IconBell />
          <span
            className="absolute top-[7px] right-[7px] w-[7px] h-[7px] rounded-full bg-[#2ED3C6] border-[1.5px] border-[#071A2F] animate-pulse-dot"
          />
        </div>

        {/* Avatar */}
        <button
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center font-sora font-bold text-xs text-[#071A2F] transition-all duration-200"
          style={{
            background: "linear-gradient(135deg, #2ED3C6, #2DA8FF)",
            boxShadow: "0 0 0 2px rgba(46,211,198,0.25)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(46,211,198,0.4)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 2px rgba(46,211,198,0.25)")}
        >
          {mockUser.initials}
        </button>
      </div>
    </header>
  );
}
