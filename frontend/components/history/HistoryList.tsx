"use client";

/**
 * HistoryList — generic paginated list shared by the Wave 2.9
 * Writing / Reading / Battle history pages. Lives outside any
 * domain folder because it has zero domain knowledge: caller
 * passes a fetcher and a row renderer.
 *
 * Empty state copy + CTA are caller-supplied — Soul §1: each
 * domain says exactly what to do next, no generic placeholder.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { HistoryPage } from "@/lib/types";

interface HistoryListProps<T> {
  fetchPage: (page: number, limit: number) => Promise<HistoryPage<T>>;
  renderRow: (item: T, index: number) => ReactNode;
  itemKey:   (item: T) => string;
  emptyState: ReactNode;
  loadingState?: ReactNode;
  /** Page size — BE default 20, hard cap 50. */
  limit?: number;
}

export default function HistoryList<T>({
  fetchPage,
  renderRow,
  itemKey,
  emptyState,
  loadingState,
  limit = 20,
}: HistoryListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage: number, append: boolean) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const data = await fetchPage(nextPage, limit);
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setPage(data.page);
      setHasMore(data.hasMore);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được lịch sử.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchPage, limit]);

  useEffect(() => { load(1, false); }, [load]);

  if (loading) {
    return loadingState ?? (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg animate-pulse"
            style={{ background: "var(--surface-secondary)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg p-4 text-center text-sm"
        style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
        {error}
        <button onClick={() => load(1, false)}
          className="block mx-auto mt-2 text-xs font-semibold underline">
          Thử lại
        </button>
      </div>
    );
  }

  if (total === 0) return <>{emptyState}</>;

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={itemKey(item)}>{renderRow(item, i)}</div>
      ))}

      {hasMore && (
        <button onClick={() => load(page + 1, true)} disabled={loadingMore}
          className="mt-2 mx-auto px-4 py-2 rounded-lg text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "var(--surface-primary)", border: "1px solid var(--surface-border)", color: "var(--color-text)" }}>
          {loadingMore ? "Đang tải..." : "Xem thêm"}
        </button>
      )}
    </div>
  );
}
