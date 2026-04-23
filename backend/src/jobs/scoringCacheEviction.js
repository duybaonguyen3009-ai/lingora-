/**
 * jobs/scoringCacheEviction.js
 *
 * Daily LRU eviction for the Writing scoring cache (table from migration
 * 0035). The cache grows unbounded until this job runs; every night at
 * 3 AM VN (20:00 UTC) it checks the row count and, if above the
 * configured threshold, deletes the oldest batch by last_hit_at.
 *
 * Pure eviction logic (`runEviction`) is split from cron scheduling so
 * tests can exercise the behaviour without waiting for a real cron tick.
 *
 * Config knobs (env):
 *   SCORING_CACHE_MAX_ROWS    default 50000 — only evict when above this
 *   SCORING_CACHE_EVICT_BATCH default 10000 — oldest rows removed per run
 */

"use strict";

const cron = require("node-cron");
const defaultRepo = require("../repositories/writingScoringCacheRepository");
const { WRITING_CACHE_VERSION } = require("../providers/ai/writingAnalyzer");

const DEFAULT_MAX_ROWS = 50_000;
const DEFAULT_BATCH_SIZE = 10_000;
// Cron expression "minute hour * * *" in UTC — 20:00 UTC == 03:00 VN (UTC+7).
const SCHEDULE_UTC = "0 20 * * *";

function readConfig() {
  const maxRows = parseInt(process.env.SCORING_CACHE_MAX_ROWS ?? "", 10);
  const batchSize = parseInt(process.env.SCORING_CACHE_EVICT_BATCH ?? "", 10);
  return {
    maxRows: Number.isFinite(maxRows) && maxRows > 0 ? maxRows : DEFAULT_MAX_ROWS,
    batchSize: Number.isFinite(batchSize) && batchSize > 0 ? batchSize : DEFAULT_BATCH_SIZE,
  };
}

/**
 * Run one eviction pass. Returns a report so the cron wrapper can log it
 * and tests can assert counts directly.
 *
 * @param {object} [opts]
 * @param {number} [opts.maxRows]
 * @param {number} [opts.batchSize]
 * @param {object} [opts.repo]  – injectable repository for tests
 * @returns {Promise<{totalRows: number, deletedCount: number, oldestKeptLastHit: (Date|null)}>}
 */
async function runEviction(opts = {}) {
  const {
    maxRows = DEFAULT_MAX_ROWS,
    batchSize = DEFAULT_BATCH_SIZE,
    currentVersion = WRITING_CACHE_VERSION,
    repo = defaultRepo,
  } = opts;

  // Purge stale-shape rows first — they'd be refetched anyway on next hit,
  // so deleting them up-front buys headroom without touching warm entries.
  const staleDeleted = repo.deleteStaleVersions
    ? await repo.deleteStaleVersions(currentVersion)
    : 0;

  const totalRows = await repo.countEntries();
  let lruDeleted = 0;
  if (totalRows > maxRows) {
    lruDeleted = await repo.deleteOldest(batchSize);
  }
  const oldestKeptLastHit = await repo.getOldestLastHit();
  const deletedCount = staleDeleted + lruDeleted;

  console.log(
    JSON.stringify({
      event: "cache_eviction_run",
      total_rows: totalRows,
      deleted_count: deletedCount,
      stale_deleted: staleDeleted,
      lru_deleted: lruDeleted,
      oldest_kept_last_hit: oldestKeptLastHit,
      max_rows: maxRows,
      batch_size: batchSize,
      cache_version: currentVersion,
    })
  );

  return { totalRows, deletedCount, staleDeleted, lruDeleted, oldestKeptLastHit };
}

/**
 * Register the cron task. Call once at startup. Returns the scheduled
 * task handle so the caller can .stop() it on graceful shutdown.
 */
function scheduleEviction() {
  const { maxRows, batchSize } = readConfig();
  console.log(
    `[eviction] Writing scoring cache eviction scheduled (20:00 UTC / 03:00 VN; max_rows=${maxRows}, batch=${batchSize})`
  );
  return cron.schedule(
    SCHEDULE_UTC,
    () => {
      runEviction({ maxRows, batchSize }).catch((err) => {
        console.error(`[eviction] run failed: ${err.message}`);
      });
    },
    { timezone: "UTC" }
  );
}

module.exports = { runEviction, scheduleEviction };
