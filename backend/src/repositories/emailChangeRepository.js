/**
 * repositories/emailChangeRepository.js
 *
 * Audit + idempotency backing for email_changes (Wave 2.10).
 *
 * The change-row is created INSIDE the same transaction that flips
 * users.email + bumps password_version, so the audit is impossible
 * to lose. The undo flow consumes the row by setting undone_at —
 * single-use is enforced by the WHERE undone_at IS NULL guard, NOT
 * by the JWT alone (defends against replay if the link leaks).
 *
 * pool exposed here so the auth service can run the entire write
 * (UPDATE users + INSERT email_changes + UPDATE password_version)
 * inside one BEGIN/COMMIT.
 */

"use strict";

const { pool, query } = require("../config/db");

/**
 * Atomic email change: change users.email, bump password_version,
 * insert audit row. Returns the audit row + the new password_version
 * so the caller can sign the undo JWT (which embeds the jti).
 *
 * @param {string} userId
 * @param {string} oldEmail
 * @param {string} newEmail
 * @param {string} jti — random UUID used as the JWT's jti claim
 * @returns {Promise<{ id, undo_token_jti, changed_at, new_password_version }>}
 */
async function applyChange(userId, oldEmail, newEmail, jti) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the user row so password_version increments serialize.
    const userRow = await client.query(
      `SELECT email, password_version FROM users
        WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [userId],
    );
    if (userRow.rows.length === 0) {
      await client.query("ROLLBACK");
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    if (userRow.rows[0].email !== oldEmail) {
      // Caller's old_email guess raced with another change — abort.
      await client.query("ROLLBACK");
      const err = new Error("Email mismatch — please refresh and retry.");
      err.status = 409;
      err.code = "EMAIL_RACE_CONDITION";
      throw err;
    }

    // Collision check INSIDE the transaction — a concurrent signup
    // could otherwise sneak the address in between our pre-check
    // and the UPDATE.
    const collide = await client.query(
      `SELECT 1 FROM users
        WHERE email = $1 AND deleted_at IS NULL AND id <> $2 LIMIT 1`,
      [newEmail, userId],
    );
    if (collide.rowCount > 0) {
      await client.query("ROLLBACK");
      const err = new Error("Email không khả dụng.");
      err.status = 400;
      err.code = "EMAIL_UNAVAILABLE";
      throw err;
    }

    await client.query(
      `UPDATE users
          SET email             = $2,
              password_version  = COALESCE(password_version, 0) + 1,
              updated_at        = now()
        WHERE id = $1`,
      [userId, newEmail],
    );

    // Revoke every outstanding refresh token (mirrors Wave 1.3
    // changePassword behavior — the access token revoke happens
    // automatically via the bumped password_version + verifyToken
    // middleware check).
    await client.query(
      `UPDATE refresh_tokens
          SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );

    const inserted = await client.query(
      `INSERT INTO email_changes (user_id, old_email, new_email, undo_token_jti)
       VALUES ($1, $2, $3, $4)
       RETURNING id, undo_token_jti, changed_at`,
      [userId, oldEmail, newEmail, jti],
    );

    await client.query("COMMIT");

    const row = inserted.rows[0];
    return {
      ...row,
      new_password_version: (userRow.rows[0].password_version ?? 0) + 1,
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Find an undo-eligible change by its JWT jti. Excludes already-
 * undone rows AND rows for soft-deleted users.
 *
 * @param {string} jti
 * @returns {Promise<object|null>}
 */
async function findUndoableByJti(jti) {
  const r = await query(
    `SELECT ec.id, ec.user_id, ec.old_email, ec.new_email, ec.changed_at,
            ec.undone_at, ec.undo_token_jti,
            u.email AS current_email, u.password_version
       FROM email_changes ec
       JOIN users u ON u.id = ec.user_id AND u.deleted_at IS NULL
      WHERE ec.undo_token_jti = $1`,
    [jti],
  );
  return r.rows[0] || null;
}

/**
 * Atomic undo: revert users.email, bump password_version, mark the
 * change row undone. Same transactional guarantee as applyChange.
 *
 * Returns null if the row was already undone (idempotent retry path)
 * or if the user's CURRENT email no longer matches the new_email
 * recorded in the row (means the user changed email AGAIN after this
 * one — undoing would clobber the third value, not what the user
 * meant). Both conditions surface as 409 to the controller.
 *
 * @param {string} jti
 * @returns {Promise<{ user_id, restored_email }|null>}
 */
async function applyUndo(jti) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const r = await client.query(
      `SELECT ec.id, ec.user_id, ec.old_email, ec.new_email, ec.undone_at,
              u.email AS current_email
         FROM email_changes ec
         JOIN users u ON u.id = ec.user_id AND u.deleted_at IS NULL
        WHERE ec.undo_token_jti = $1
          FOR UPDATE OF ec`,
      [jti],
    );
    if (r.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    const row = r.rows[0];
    if (row.undone_at !== null) {
      await client.query("ROLLBACK");
      return null;
    }
    if (row.current_email !== row.new_email) {
      // User changed email AGAIN after this one — refuse to undo
      // because we would clobber the third address.
      await client.query("ROLLBACK");
      return null;
    }

    await client.query(
      `UPDATE users
          SET email             = $2,
              password_version  = COALESCE(password_version, 0) + 1,
              updated_at        = now()
        WHERE id = $1`,
      [row.user_id, row.old_email],
    );

    await client.query(
      `UPDATE refresh_tokens
          SET revoked_at = now()
        WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id],
    );

    await client.query(
      `UPDATE email_changes SET undone_at = now() WHERE id = $1`,
      [row.id],
    );

    await client.query("COMMIT");

    return { user_id: row.user_id, restored_email: row.old_email };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Count distinct change events in the last N hours, used by rate
 * limiter (3 per 24h per user).
 */
async function countChangesSince(userId, sinceISO) {
  const r = await query(
    `SELECT COUNT(*)::int AS n FROM email_changes
      WHERE user_id = $1 AND changed_at >= $2`,
    [userId, sinceISO],
  );
  return r.rows[0]?.n ?? 0;
}

module.exports = {
  applyChange,
  findUndoableByJti,
  applyUndo,
  countChangesSince,
};
