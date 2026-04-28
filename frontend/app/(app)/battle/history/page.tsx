"use client";

/**
 * /battle/history — flat list of past Battle matches (Wave 2.9).
 *
 * Differs from BattleTab's home-page recentMatches slice (3 or 5
 * items) by being paginated + complete. Opponent identity is
 * resolved by the BE join — anonymized opponents (Wave 2.7) appear
 * with their placeholder name "Người dùng đã xóa" rather than
 * being filtered out.
 */

import Link from "next/link";
import { getBattleHistory } from "@/lib/api";
import HistoryList from "@/components/history/HistoryList";
import HistoryEmptyState from "@/components/history/HistoryEmptyState";
import type { BattleHistoryItem } from "@/lib/types";

const RESULT_STYLE: Record<BattleHistoryItem["result"], { color: string; label: string }> = {
  won:     { color: "#22C55E", label: "Thắng" },
  lost:    { color: "#EF4444", label: "Thua" },
  draw:    { color: "#F59E0B", label: "Hòa" },
  pending: { color: "#94A3B8", label: "Chưa hoàn tất" },
};

export default function BattleHistoryPage() {
  return (
    <div className="min-h-dvh px-4 sm:px-8 py-10 max-w-2xl mx-auto flex flex-col gap-6"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Lịch sử Battle</h1>
        <Link href="/home" className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          ← Trang chủ
        </Link>
      </header>

      <HistoryList<BattleHistoryItem>
        fetchPage={getBattleHistory}
        itemKey={(m) => m.id}
        emptyState={
          <HistoryEmptyState
            message="Bạn chưa tham gia Battle nào."
            ctaLabel="Vào Arena"
            ctaHref="/battle"
          />
        }
        renderRow={(m) => {
          const style = RESULT_STYLE[m.result];
          const opponentLabel =
            m.opponent_name ?? m.opponent_username ?? "Người dùng đã xóa";
          const initials = opponentLabel.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
          return (
            <div className="flex items-center gap-3 rounded-lg p-3"
              style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)" }}>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden shrink-0"
                style={{ background: "linear-gradient(135deg, #1B2B4B, #2D4A7A)", color: "#fff" }}>
                {m.opponent_avatar
                  ? <img src={m.opponent_avatar} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                  vs {opponentLabel}
                </div>
                <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  {new Date(m.played_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" })}
                  {m.passage_title && <> · {m.passage_title}</>}
                </div>
              </div>

              {/* Score + result */}
              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <div className="text-xs font-semibold" style={{ color: style.color }}>
                  {style.label}
                </div>
                {m.my_score != null && m.opponent_score != null && (
                  <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                    {Number(m.my_score).toLocaleString()} – {Number(m.opponent_score).toLocaleString()}
                  </div>
                )}
                {m.rank_delta != null && m.rank_delta !== 0 && (
                  <div className="text-xs font-semibold" style={{ color: m.rank_delta > 0 ? "#22C55E" : "#EF4444" }}>
                    {m.rank_delta > 0 ? "+" : ""}{m.rank_delta} RP
                  </div>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
