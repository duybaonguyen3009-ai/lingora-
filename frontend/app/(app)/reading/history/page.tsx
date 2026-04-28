"use client";

/**
 * /reading/history — flat list of past Reading practice attempts
 * (Wave 2.9, R1 scope).
 *
 * KNOWN LIMITATION: per-attempt band is NOT shown. submitPractice
 * never persists the score — it's computed and returned in the
 * HTTP response only. Each row therefore carries timestamp +
 * passage title + XP earned. The Wave backlog R2 (reading_attempts
 * table) will populate per-attempt band later.
 */

import Link from "next/link";
import { getReadingHistory } from "@/lib/api";
import HistoryList from "@/components/history/HistoryList";
import HistoryEmptyState from "@/components/history/HistoryEmptyState";
import type { ReadingHistoryItem } from "@/lib/types";

export default function ReadingHistoryPage() {
  return (
    <div className="min-h-dvh px-4 sm:px-8 py-10 max-w-2xl mx-auto flex flex-col gap-6"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Lịch sử Reading</h1>
        <Link href="/home" className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          ← Trang chủ
        </Link>
      </header>

      <HistoryList<ReadingHistoryItem>
        fetchPage={getReadingHistory}
        itemKey={(r) => r.id}
        emptyState={
          <HistoryEmptyState
            message="Bạn chưa luyện Reading."
            ctaLabel="Bắt đầu luyện"
            ctaHref="/home-legacy?tab=reading&mode=practice"
          />
        }
        renderRow={(r) => (
          <div
            className="flex items-center gap-3 rounded-lg p-3"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)" }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0"
              style={{ background: "rgba(0,168,150,0.10)" }}>
              📖
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
                {r.passage_title ?? "Bài đọc đã ẩn"}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {new Date(r.attempted_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
            <div className="text-xs font-semibold" style={{ color: "#F59E0B" }}>
              +{r.xp_earned} XP
            </div>
          </div>
        )}
      />
    </div>
  );
}
