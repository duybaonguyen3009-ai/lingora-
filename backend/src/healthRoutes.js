/**
 * healthRoutes.js
 *
 * Two endpoints:
 *
 *   GET /health         — liveness. Hardcoded 200 (no DB touch). Used
 *                         by external uptime monitors.
 *
 *   GET /health/schema  — schema-aware readiness gate (Wave INFRA-001).
 *                         Compares the latest migration file present
 *                         in the deployed image vs the most recent
 *                         row in pgmigrations. Mismatch → 500 with a
 *                         drift payload. This is what Railway's
 *                         healthcheckPath should target — it blocks
 *                         cutover when the schema didn't migrate.
 */

const { Router } = require("express");
const fs = require("fs");
const path = require("path");
const { query } = require("./config/db");

const router = Router();

// ─── Liveness ──────────────────────────────────────────────────────────────

router.get("/", (_req, res) => {
  res.status(200).json({
    success:   true,
    service:   "lingona-api",
    status:    "ok",
    timestamp: new Date().toISOString(),
  });
});

// ─── Readiness — schema drift detector ─────────────────────────────────────

const MIGRATIONS_DIR = path.resolve(__dirname, "..", "migrations");

/**
 * Read the most recent migration filename from the deployed image's
 * filesystem. Strips the .js extension so the value matches what
 * node-pg-migrate stores in pgmigrations.name.
 *
 * Falls back to null on read errors — the caller treats null as a
 * 500 condition.
 *
 * @returns {string|null}
 */
function expectedLatestMigration() {
  try {
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => /^\d{4}_.*\.js$/.test(f))
      .sort();
    if (files.length === 0) return null;
    return files[files.length - 1].replace(/\.js$/, "");
  } catch {
    return null;
  }
}

router.get("/schema", async (_req, res) => {
  const expected = expectedLatestMigration();
  if (!expected) {
    return res.status(500).json({
      ok:    false,
      error: "schema_check_failed",
      stage: "filesystem_read",
    });
  }

  let applied;
  try {
    const r = await query(
      "SELECT name FROM pgmigrations ORDER BY id DESC LIMIT 1",
    );
    applied = r.rows[0]?.name ?? null;
  } catch {
    return res.status(500).json({
      ok:    false,
      error: "schema_check_failed",
      stage: "db_query",
    });
  }

  if (applied !== expected) {
    return res.status(500).json({
      ok:       false,
      drift:    true,
      expected,
      applied,
    });
  }

  return res.status(200).json({
    ok:     true,
    latest: applied,
  });
});

module.exports = router;
