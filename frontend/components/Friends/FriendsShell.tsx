"use client";

/**
 * FriendsShell — PR7.1 outer wrapper around the existing FriendsTab.
 *
 * Adds:
 *   - Desktop breadcrumb (Hồ sơ › {subTab label})
 *   - Kebab-menu header (only for the chat sub-tab — other sub-tabs are
 *     navigation destinations themselves)
 *
 * Does not touch ChatTab internals, voice MediaRecorder logic, or polling.
 * FriendsTab receives activeSubTab via prop so routes can drive which view
 * renders — the in-component sub-tab state stays around for existing
 * active-conversation side-effects.
 */

import FriendsTab from "@/components/Social/FriendsTab";
import ConversationListHeader from "./ConversationListHeader";

type SubTab = "chat" | "friends" | "requests" | "add" | "rooms";

const SUBTAB_LABEL: Record<SubTab, string> = {
  chat: "Tin nhắn",
  friends: "Danh sách bạn bè",
  requests: "Lời mời kết bạn",
  add: "Thêm bạn",
  rooms: "Phòng học chung",
};

interface Props {
  activeSubTab: SubTab;
}

export default function FriendsShell({ activeSubTab }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb — desktop only */}
      <nav className="hidden lg:flex items-center gap-2 text-xs font-medium" aria-label="Breadcrumb">
        <span style={{ color: "var(--color-text-tertiary)" }}>Hồ sơ</span>
        <span style={{ color: "var(--color-text-tertiary)" }}>›</span>
        <span style={{ color: "var(--color-teal-accent)" }}>{SUBTAB_LABEL[activeSubTab]}</span>
      </nav>

      {/* Kebab header — only show above the conversation area for Chat sub-tab.
          Other sub-tabs (Requests / Add / Rooms) are destinations in their
          own right; a kebab on those would be redundant chrome. */}
      {activeSubTab === "chat" && <ConversationListHeader />}

      <FriendsTab activeSubTab={activeSubTab} />
    </div>
  );
}
