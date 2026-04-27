/**
 * repositories/authRepository.js
 *
 * All SQL for authentication: user lookups, user creation, and refresh
 * token lifecycle (store, find, revoke).
 *
 * Rules:
 *  - Only SQL. No business logic, no password hashing, no token generation.
 *  - Returns raw pg rows exactly as the DB returns them.
 */

const db = require("../config/db");

// ─── SQL ─────────────────────────────────────────────────────────────────────

const SQL_FIND_USER_BY_EMAIL = `
  SELECT id, email, name, role, password_hash, password_version, dob, parent_id,
         consent_at, avatar_url, created_at
  FROM   users
  WHERE  email      = $1
    AND  deleted_at IS NULL
  LIMIT  1;
`;

const SQL_FIND_USER_BY_ID = `
  SELECT id, email, name, role, avatar_url, password_hash, password_version, created_at
  FROM   users
  WHERE  id         = $1
    AND  deleted_at IS NULL
  LIMIT  1;
`;

const SQL_CREATE_USER = `
  INSERT INTO users (email, name, password_hash, role, dob)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id, email, name, role, dob, password_hash, password_version, created_at;
`;

// Cheap projection used by verifyToken middleware on every authenticated
// request. Returns NULL if the user was deleted — caller treats as 401.
const SQL_GET_PASSWORD_VERSION_BY_ID = `
  SELECT password_version
  FROM   users
  WHERE  id         = $1
    AND  deleted_at IS NULL
  LIMIT  1;
`;

// Atomic password rotation:
//   1. Bump password_version (invalidates all access JWTs).
//   2. Revoke every active refresh_tokens row for the user.
// Wrapped in a single transaction in the service so the two writes
// are observed together by any concurrent /auth/refresh attempt.
const SQL_UPDATE_PASSWORD_AND_BUMP_VERSION = `
  UPDATE users
  SET    password_hash    = $2,
         password_version = password_version + 1,
         updated_at       = NOW()
  WHERE  id               = $1
    AND  deleted_at       IS NULL
  RETURNING password_version;
`;

const SQL_REVOKE_ALL_USER_REFRESH_TOKENS = `
  UPDATE refresh_tokens
  SET    revoked_at = NOW()
  WHERE  user_id    = $1
    AND  revoked_at IS NULL;
`;

const SQL_EMAIL_EXISTS = `
  SELECT 1 FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1;
`;

const SQL_STORE_REFRESH_TOKEN = `
  INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at)
  VALUES ($1, $2, $3, $4)
  RETURNING id;
`;

// Finds a token that has not been revoked and has not expired.
const SQL_FIND_ACTIVE_REFRESH_TOKEN = `
  SELECT id, user_id, family, expires_at
  FROM   refresh_tokens
  WHERE  token_hash  = $1
    AND  revoked_at  IS NULL
    AND  expires_at  > NOW()
  LIMIT  1;
`;

// Used during reuse detection: find ANY token with this hash (even revoked).
const SQL_FIND_ANY_REFRESH_TOKEN = `
  SELECT id, user_id, family, revoked_at
  FROM   refresh_tokens
  WHERE  token_hash = $1
  LIMIT  1;
`;

const SQL_REVOKE_REFRESH_TOKEN = `
  UPDATE refresh_tokens
  SET    revoked_at = NOW()
  WHERE  token_hash = $1
    AND  revoked_at IS NULL;
`;

// Revokes all tokens that share the same family (reuse / compromise response).
const SQL_REVOKE_REFRESH_TOKEN_FAMILY = `
  UPDATE refresh_tokens
  SET    revoked_at = NOW()
  WHERE  family     = $1
    AND  revoked_at IS NULL;
`;

// ─── Repository functions ─────────────────────────────────────────────────────

/**
 * Find a user by email address.
 * Returns undefined when no active user matches.
 * @param {string} email
 * @returns {Promise<object|undefined>}
 */
async function findByEmail(email) {
  const { rows } = await db.query(SQL_FIND_USER_BY_EMAIL, [email]);
  return rows[0];
}

/**
 * Find a user by primary key.
 * Returns undefined when no active user matches.
 * @param {string} userId – UUID
 * @returns {Promise<object|undefined>}
 */
async function findById(userId) {
  const { rows } = await db.query(SQL_FIND_USER_BY_ID, [userId]);
  return rows[0];
}

/**
 * Check if an email address is already registered.
 * @param {string} email
 * @returns {Promise<boolean>}
 */
async function emailExists(email) {
  const { rows } = await db.query(SQL_EMAIL_EXISTS, [email]);
  return rows.length > 0;
}

/**
 * Insert a new user row.
 * @param {{ email: string, name: string, passwordHash: string, role: string, dob: string|null }} params
 * @returns {Promise<object>} – the created user row (id, email, name, role, dob, created_at)
 */
async function createUser({ email, name, passwordHash, role, dob }) {
  const { rows } = await db.query(SQL_CREATE_USER, [
    email,
    name,
    passwordHash,
    role   || "kid",
    dob    || null,
  ]);
  return rows[0];
}

/**
 * Persist a new refresh token record.
 * @param {{ userId: string, tokenHash: string, family: string, expiresAt: Date }} params
 * @returns {Promise<void>}
 */
async function storeRefreshToken({ userId, tokenHash, family, expiresAt }) {
  await db.query(SQL_STORE_REFRESH_TOKEN, [userId, tokenHash, family, expiresAt]);
}

/**
 * Look up a refresh token that is neither revoked nor expired.
 * Returns undefined if the token is invalid, expired, or already used.
 * @param {string} tokenHash – SHA-256 hex of the raw token
 * @returns {Promise<object|undefined>}
 */
async function findActiveRefreshToken(tokenHash) {
  const { rows } = await db.query(SQL_FIND_ACTIVE_REFRESH_TOKEN, [tokenHash]);
  return rows[0];
}

/**
 * Look up ANY refresh token by hash, including revoked ones.
 * Used for reuse detection: if a revoked token is presented, we know the
 * refresh token family may be compromised and should be fully revoked.
 * @param {string} tokenHash
 * @returns {Promise<object|undefined>}
 */
async function findAnyRefreshToken(tokenHash) {
  const { rows } = await db.query(SQL_FIND_ANY_REFRESH_TOKEN, [tokenHash]);
  return rows[0];
}

/**
 * Mark a single refresh token as revoked.
 * Safe to call on an already-revoked token (no-op).
 * @param {string} tokenHash
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(tokenHash) {
  await db.query(SQL_REVOKE_REFRESH_TOKEN, [tokenHash]);
}

/**
 * Revoke every token that belongs to a given family.
 * Called when a reuse attack is detected to invalidate all live sessions
 * derived from the compromised family.
 * @param {string} family – UUID
 * @returns {Promise<void>}
 */
async function revokeRefreshTokenFamily(family) {
  await db.query(SQL_REVOKE_REFRESH_TOKEN_FAMILY, [family]);
}

/**
 * Cheap lookup used by the auth middleware to enforce password_version
 * binding on every authenticated request.
 *
 * @param {string} userId – UUID
 * @returns {Promise<number|null>} current password_version, or null if user not found / deleted
 */
async function getPasswordVersion(userId) {
  const { rows } = await db.query(SQL_GET_PASSWORD_VERSION_BY_ID, [userId]);
  return rows[0] ? rows[0].password_version : null;
}

/**
 * Atomically rotate a user's password: hash + version bump + revoke all
 * active refresh tokens. Runs inside a single transaction so a concurrent
 * /auth/refresh sees either the OLD state (rejected by row lock wait) or
 * the NEW state (revoked → reuse-detection path).
 *
 * @param {string} userId
 * @param {string} newHash – pre-hashed bcrypt string
 * @returns {Promise<{ newVersion: number, revokedTokens: number }>}
 */
async function rotatePasswordAndRevokeSessions(userId, newHash) {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(SQL_UPDATE_PASSWORD_AND_BUMP_VERSION, [userId, newHash]);
    if (rows.length === 0) {
      await client.query("ROLLBACK");
      const err = new Error("User not found");
      err.code = "USER_NOT_FOUND";
      err.status = 404;
      throw err;
    }
    const revokeResult = await client.query(SQL_REVOKE_ALL_USER_REFRESH_TOKENS, [userId]);
    await client.query("COMMIT");
    return {
      newVersion: rows[0].password_version,
      revokedTokens: revokeResult.rowCount || 0,
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch { /* ignore rollback failures */ }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  findByEmail,
  findById,
  emailExists,
  createUser,
  storeRefreshToken,
  findActiveRefreshToken,
  findAnyRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenFamily,
  getPasswordVersion,
  rotatePasswordAndRevokeSessions,
};
