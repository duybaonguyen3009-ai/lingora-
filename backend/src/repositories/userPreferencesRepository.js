"use strict";

const { query } = require("../config/db");

async function getPreferences(userId) {
  const result = await query(
    `SELECT preferences FROM users WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  if (!result.rows[0]) return null;
  return result.rows[0].preferences ?? {};
}

async function mergePreferences(userId, patch) {
  const result = await query(
    `UPDATE users
     SET preferences = preferences || $2::jsonb, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING preferences`,
    [userId, JSON.stringify(patch)]
  );
  if (!result.rows[0]) return null;
  return result.rows[0].preferences ?? {};
}

module.exports = { getPreferences, mergePreferences };
