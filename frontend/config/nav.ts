import type { ComponentType } from "react";
import {
  IconHome,
  IconBook,
  IconMic,
  IconPen,
  IconOpenBook,
  IconHeadphones,
  IconGraduationCap,
  IconSwords,
  IconUsers,
  IconUser,
} from "@/components/Icons";

export type NavSurface = "sidebar" | "bottomnav";

export type NavIcon = ComponentType<{ size?: number; className?: string }>;

export type NavItem = {
  id: string;
  label: string;
  icon: NavIcon;
  /** Navigate target. Groups without href do not navigate — they only toggle expand. */
  href?: string;
  /** Temporary: legacy tab key if the screen still lives in /home-legacy (not used in PR3). */
  legacyTab?: string;
  children?: NavItem[];
  showIn: NavSurface[];
  proOnly?: boolean;
  badge?: string;
};

/**
 * PR3 nav tree.
 *
 *   Home
 *   IELTS Exam          [group, href=/exam]
 *     Speaking
 *     Writing
 *     Reading
 *     Listening
 *   Learn               [group, no href — toggle only]
 *     Ngữ pháp
 *     Nói theo tình huống
 *   Battle
 *   Friends
 *   Profile
 *
 * BottomNav: home, exam, battle, friends, profile (flat, 5 items, same ids).
 *
 * "Tiến độ Writing" quick link lives in the sidebar footer as a hardcoded
 * anchor (not a NAV_ITEMS entry) — kept verbatim to avoid regressing the
 * existing visual treatment.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: IconHome,
    href: "/home",
    showIn: ["sidebar", "bottomnav"],
  },
  {
    id: "exam",
    label: "IELTS Exam",
    icon: IconGraduationCap,
    href: "/exam",
    showIn: ["sidebar", "bottomnav"],
    children: [
      { id: "exam.speaking",  label: "Speaking",  icon: IconMic,        href: "/exam/speaking",  showIn: ["sidebar"] },
      { id: "exam.writing",   label: "Writing",   icon: IconPen,        href: "/exam/writing",   showIn: ["sidebar"] },
      { id: "exam.reading",   label: "Reading",   icon: IconOpenBook,   href: "/exam/reading",   showIn: ["sidebar"] },
      { id: "exam.listening", label: "Listening", icon: IconHeadphones, href: "/exam/listening", showIn: ["sidebar"] },
    ],
  },
  {
    id: "learn",
    label: "Learn",
    icon: IconBook,
    showIn: ["sidebar"],
    children: [
      { id: "learn.grammar",   label: "Ngữ pháp",            icon: IconPen, href: "/learn/grammar",   showIn: ["sidebar"] },
      { id: "learn.scenarios", label: "Nói theo tình huống", icon: IconMic, href: "/learn/scenarios", showIn: ["sidebar"] },
    ],
  },
  {
    id: "battle",
    label: "Battle",
    icon: IconSwords,
    href: "/battle",
    showIn: ["sidebar", "bottomnav"],
  },
  {
    id: "friends",
    label: "Friends",
    icon: IconUsers,
    href: "/friends",
    showIn: ["sidebar", "bottomnav"],
  },
  {
    id: "profile",
    label: "Profile",
    icon: IconUser,
    href: "/profile",
    showIn: ["sidebar", "bottomnav"],
  },
];

/** Label overrides per surface — preserves current Vietnamese labels on bottomnav. */
export const BOTTOMNAV_LABEL_OVERRIDES: Record<string, string> = {
  home: "Trang chủ",
  exam: "Thi",
  battle: "Đấu",
  friends: "Bạn bè",
  profile: "Hồ sơ",
};

export function itemsForSurface(surface: NavSurface): NavItem[] {
  return NAV_ITEMS.filter((i) => i.showIn.includes(surface));
}

/** Resolve the destination for a nav item click. Groups without href return ''. */
export function navHref(item: NavItem): string {
  if (item.href) return item.href;
  if (item.legacyTab) return `/home-legacy?tab=${item.legacyTab}`;
  return "";
}

/**
 * Derive the active nav item id from the current pathname (+ optional search params).
 *
 * Nested routes (/exam/speaking) return the child id (exam.speaking).
 * Callers that need the parent id for group-expand can split on '.'.
 */
export function matchActiveNavId(
  pathname: string,
  searchParams?: URLSearchParams | null,
): string {
  // Exact top-level
  if (pathname === "/home") return "home";
  if (pathname === "/exam") return "exam";
  if (pathname === "/battle" || pathname.startsWith("/battle/")) return "battle";
  if (pathname === "/friends" || pathname.startsWith("/friends/")) return "friends";
  if (pathname === "/profile" || pathname.startsWith("/profile/")) return "profile";
  if (pathname.startsWith("/writing/progress")) return "home";
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return "settings";

  // Nested (app) routes
  if (pathname.startsWith("/exam/speaking"))  return "exam.speaking";
  if (pathname.startsWith("/exam/writing"))   return "exam.writing";
  if (pathname.startsWith("/exam/reading"))   return "exam.reading";
  if (pathname.startsWith("/exam/listening")) return "exam.listening";
  if (pathname.startsWith("/exam/"))          return "exam";

  if (pathname.startsWith("/learn/grammar"))   return "learn.grammar";
  if (pathname.startsWith("/learn/scenarios")) return "learn.scenarios";

  // Legacy fallback (still mapped for /home-legacy god-component until PR5)
  if (pathname === "/home-legacy" || pathname.startsWith("/home-legacy")) {
    const tab = searchParams?.get("tab");
    const tabToNav: Record<string, string> = {
      speaking: "exam.speaking",
      writing: "exam.writing",
      reading: "exam.reading",
      listening: "exam.listening",
      grammar: "learn.grammar",
      scenarios: "learn.scenarios",
      exam: "exam",
      battle: "battle",
      social: "friends",
      friends: "friends",
      profile: "profile",
      home: "home",
    };
    return (tab && tabToNav[tab]) || "home";
  }

  return "home";
}

/** Return the parent group id for a nested active id (e.g. "exam.speaking" → "exam"). */
export function parentGroupId(activeId: string): string | null {
  const dot = activeId.indexOf(".");
  return dot === -1 ? null : activeId.slice(0, dot);
}
