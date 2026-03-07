/**
 * config/db.js
 *
 * Creates and exports a single pg Pool instance shared across all
 * repositories. Using a pool (rather than a new Client per query) means
 * connections are reused and the app stays efficient under concurrent load.
 *
 * The pool reads its connection string from config so process.env is never
 * accessed outside the config layer.
 */

const { Pool } = require("pg");
const config = require("./index");

const pool = new Pool({
  connectionString: config.db.url,
  // Sensible defaults — tune in production via env vars if needed.
  max: 10,                 // maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Surface connection errors without crashing — the error handler in each
// query will surface them to the caller.
pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

/**
 * Run a parameterised query.
 *
 * @param {string}  text    – SQL string with $1, $2 … placeholders
 * @param {Array}   [params] – parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);

  if (config.env === "development") {
    const duration = Date.now() - start;
    console.debug(`[db] query (${duration}ms)`, text.slice(0, 80).replace(/\s+/g, " "));
  }

  return result;
}

module.exports = { query, pool };
