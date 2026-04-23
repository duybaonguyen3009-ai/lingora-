/**
 * repositories/writingScoringCacheRepository.js
 *
 * Reads and writes the writing_scoring_cache table introduced by
 * migration 0035. The cache stores median-aggregated scoring results
 * keyed by SHA256(essay + prompt_signature).
 */

"use strict";

const { query } = require("../config/db");

/**
 * Look up a cached scoring by cache_key. When found, bumps hit_count
 * and last_hit_at in the same statement so analytics stay fresh.
 * Returns the row (including scoring_result) or null.
 */
async function findByCacheKey(cacheKey) {
  const result = await query(
    `UPDATE writing_scoring_cache
        SET hit_count   = hit_count + 1,
            last_hit_at = now()
      WHERE cache_key = $1
      RETURNING id, cache_key, essay_hash, writing_question_id, task_type,
                scoring_result, sample_count, hit_count, created_at, last_hit_at`,
    [cacheKey]
  );
  return result.rows[0] || null;
}

/**
 * Insert a new cache entry. Uses ON CONFLICT DO NOTHING so a race between
 * two concurrent scoring calls for the same essay never throws — the loser
 * just skips the write.
 *
 * @param {object} entry
 * @param {string}      entry.cacheKey
 * @param {string}      entry.essayHash
 * @param {string|null} entry.writingQuestionId
 * @param {string}      entry.taskType
 * @param {object}      entry.scoringResult
 * @param {number}      entry.sampleCount
 * @returns {Promise<boolean>} true if inserted, false if a row already existed
 */
async function insertEntry(entry) {
  const result = await query(
    `INSERT INTO writing_scoring_cache
       (cache_key, essay_hash, writing_question_id, task_type, scoring_result, sample_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (cache_key) DO NOTHING
     RETURNING id`,
    [
      entry.cacheKey,
      entry.essayHash,
      entry.writingQuestionId ?? null,
      entry.taskType,
      JSON.stringify(entry.scoringResult),
      entry.sampleCount,
    ]
  );
  return result.rowCount > 0;
}

/**
 * Delete the oldest N entries by last_hit_at (LRU). Tie-broken by id to
 * keep deletion deterministic. Used by the eviction cron.
 *
 * @param {number} count
 * @returns {Promise<number>} – number of rows deleted
 */
async function deleteOldest(count) {
  if (!Number.isInteger(count) || count <= 0) return 0;
  const result = await query(
    `DELETE FROM writing_scoring_cache
      WHERE id IN (
        SELECT id FROM writing_scoring_cache
         ORDER BY last_hit_at ASC, id ASC
         LIMIT $1
      )`,
    [count]
  );
  return result.rowCount;
}

/**
 * Delete every row whose stored scoring_result.cache_version is lower than
 * the current version. Rows with no cache_version field default to v1.
 * Called by the eviction cron before the LRU pass so stale shapes leave
 * first regardless of last_hit_at.
 *
 * @param {number} currentVersion
 * @returns {Promise<number>} – rows deleted
 */
async function deleteStaleVersions(currentVersion) {
  const result = await query(
    `DELETE FROM writing_scoring_cache
      WHERE COALESCE((scoring_result->>'cache_version')::int, 1) < $1`,
    [currentVersion]
  );
  return result.rowCount;
}

/** Total row count — used by the eviction cron before deciding to trim. */
async function countEntries() {
  const result = await query(`SELECT COUNT(*)::int AS c FROM writing_scoring_cache`);
  return result.rows[0].c;
}

/** Oldest kept last_hit_at after eviction — for the eviction log line. */
async function getOldestLastHit() {
  const result = await query(
    `SELECT last_hit_at FROM writing_scoring_cache
      ORDER BY last_hit_at ASC LIMIT 1`
  );
  return result.rows[0]?.last_hit_at ?? null;
}

module.exports = {
  findByCacheKey,
  insertEntry,
  deleteOldest,
  deleteStaleVersions,
  countEntries,
  getOldestLastHit,
};
