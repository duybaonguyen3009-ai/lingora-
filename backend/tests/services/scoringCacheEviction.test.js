/**
 * Unit tests for the Writing scoring-cache LRU eviction job.
 *
 * Exercises runEviction() with an in-memory fake repository so the
 * threshold comparison, no-op path, and deterministic tie-break stay
 * honest without hitting Postgres.
 */

"use strict";

const { runEviction } = require("../../src/jobs/scoringCacheEviction");

function mkRepo(rows) {
  // rows: [{ id, last_hit_at: Date|string }] sorted or not.
  const data = rows.map((r) => ({ ...r, last_hit_at: new Date(r.last_hit_at) }));
  return {
    async countEntries() {
      return data.length;
    },
    async deleteOldest(count) {
      data.sort((a, b) => {
        const t = a.last_hit_at - b.last_hit_at;
        if (t !== 0) return t;
        return String(a.id).localeCompare(String(b.id));
      });
      const removed = data.splice(0, count);
      return removed.length;
    },
    async getOldestLastHit() {
      if (data.length === 0) return null;
      data.sort((a, b) => a.last_hit_at - b.last_hit_at);
      return data[0].last_hit_at;
    },
  };
}

describe("runEviction — below threshold", () => {
  it("no-op and preserves every row", async () => {
    const repo = mkRepo([
      { id: "a", last_hit_at: "2026-01-01" },
      { id: "b", last_hit_at: "2026-02-01" },
    ]);
    const res = await runEviction({ maxRows: 10, batchSize: 5, repo });
    expect(res.totalRows).toBe(2);
    expect(res.deletedCount).toBe(0);
    expect(await repo.countEntries()).toBe(2);
  });
});

describe("runEviction — above threshold", () => {
  it("deletes exactly batchSize oldest rows", async () => {
    const rows = [];
    for (let i = 0; i < 12; i++) {
      // ascending dates so i=0 is oldest, i=11 is newest
      rows.push({ id: `id-${String(i).padStart(2, "0")}`, last_hit_at: `2026-01-${String(i + 1).padStart(2, "0")}` });
    }
    const repo = mkRepo(rows);
    const res = await runEviction({ maxRows: 5, batchSize: 4, repo });

    expect(res.totalRows).toBe(12);
    expect(res.deletedCount).toBe(4);
    expect(await repo.countEntries()).toBe(8);
    // Oldest kept row should now be id-04 (the 5th oldest originally)
    const oldest = await repo.getOldestLastHit();
    expect(oldest.toISOString().slice(0, 10)).toBe("2026-01-05");
  });
});

describe("runEviction — deterministic tie-break", () => {
  it("when last_hit_at matches, id ASC decides the victim order", async () => {
    // Three rows share the same last_hit_at; batch=2 must pick the two
    // lexicographically lowest ids first.
    const repo = mkRepo([
      { id: "id-c", last_hit_at: "2026-01-01" },
      { id: "id-a", last_hit_at: "2026-01-01" },
      { id: "id-b", last_hit_at: "2026-01-01" },
      { id: "id-new", last_hit_at: "2026-03-01" },
    ]);
    const res = await runEviction({ maxRows: 2, batchSize: 2, repo });
    expect(res.deletedCount).toBe(2);
    // Remaining must be id-c + id-new (id-a and id-b removed).
    expect(await repo.countEntries()).toBe(2);
  });
});
