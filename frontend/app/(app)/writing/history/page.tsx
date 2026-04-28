"use client";

/**
 * /writing/history — flat list of past Writing submissions (Wave 2.9).
 *
 * Sibling of /writing/progress. progress is the analytics dashboard
 * (band trend, error patterns); history is the per-submission list.
 * They consume the same /api/v1/writing/history endpoint but
 * render orthogonal views — keeping them separate avoids bloating
 * either.
 */

import Link from "next/link";
import { useCallback } from "react";
import { getWritingHistory } from "@/lib/api";
import HistoryList from "@/components/history/HistoryList";
import HistoryEmptyState from "@/components/history/HistoryEmptyState";
import { bandColor } from "@/lib/bandColors";
import type { HistoryPage, WritingSubmissionSummary } from "@/lib/types";

export default function WritingHistoryPage() {
  // Adapter: existing endpoint returns { submissions, page, limit }
  // (see ProgressClient). Map to the generic HistoryPage<T> shape.
  const fetchPage = useCallback(
    async (page: number, limit: number): Promise<HistoryPage<WritingSubmissionSummary>> => {
      const data = await getWritingHistory(page, limit);
      const items = data.submissions ?? [];
      // Endpoint pre-Wave 2.9 doesn't return `total`; we approximate
      // hasMore by comparing the page size we asked for to the size
      // we got. Good enough for paginated UI; an exact count is a
      // R2-class follow-up if BE adds it later.
      const hasMore = items.length === limit;
      return {
        items,
        total:   items.length + (hasMore ? limit : 0), // lower-bound estimate
        page,
        limit,
        hasMore,
      };
    },
    [],
  );

  return (
    <div className="min-h-dvh px-4 sm:px-8 py-10 max-w-2xl mx-auto flex flex-col gap-6"
      style={{ backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}>
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-display font-bold">Lịch sử Writing</h1>
        <Link href="/home" className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          ← Trang chủ
        </Link>
      </header>

      <HistoryList<WritingSubmissionSummary>
        fetchPage={fetchPage}
        itemKey={(s) => s.id}
        emptyState={
          <HistoryEmptyState
            message="Bạn chưa nộp bài Writing nào."
            ctaLabel="Viết bài đầu tiên"
            ctaHref="/writing"
          />
        }
        renderRow={(s) => (
          // Row is informational only this commit. A clickable detail
          // route (/writing/result/[id]) is a deliberate follow-up —
          // current detail rendering lives inside <WritingTab> and
          // requires lifting state to a dedicated page first.
          <div
            className="flex items-center gap-3 rounded-lg p-3"
            style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded"
              style={{ background: "var(--surface-secondary)", color: "var(--color-text-secondary)" }}>
              {s.task_type === "task1" ? "Task 1" : "Task 2"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.question_text || "(no prompt)"}</div>
              <div className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {new Date(s.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" })}
                {" · "}
                {s.word_count} từ
              </div>
            </div>
            {s.overall_band != null && (
              <div className="text-lg font-bold" style={{ color: bandColor(Number(s.overall_band)) }}>
                {Number(s.overall_band).toFixed(1)}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
