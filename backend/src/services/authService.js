/**
 * services/authService.js
 *
 * Business logic for authentication: registration, login, token rotation,
 * logout, and COPPA age-gate enforcement.
 *
 * Token strategy (locked in CLAUDE.md):
 *   Access token  – short-lived JWT (15 min). Returned in the response body.
 *                   Stored in Zustand memory on the frontend. Never in localStorage.
 *   Refresh token – long-lived random value (30 days). Hash stored in the DB.
 *                   Sent to the client as an httpOnly SameSite=Strict cookie.
 *                   Rotated on every use. Entire family revoked on reuse detection.
 */

const crypto  = require("crypto");
const bcrypt  = require("bcryptjs");
const jwt     = require("jsonwebtoken");

const config          = require("../config");
const authRepository  = require("../repositories/authRepository");

// ─── Constants ────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS   = 12;
const COPPA_AGE_LIMIT = 13; // Years. Under this age triggers parental consent.

// ─── Private helpers ──────────────────────────────────────────────────────────

/**
 * Create a standardised HTTP error.
 * @param {string} message
 * @param {number} status
 * @returns {Error}
 */
function httpError(message, status) {
  const err  = new Error(message);
  err.status = status;
  return err;
}

/**
 * Calculate the user's age in whole years from a date of birth string.
 * @param {string} dob – ISO date string "YYYY-MM-DD"
 * @returns {number}
 */
function ageFromDob(dob) {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Hash a plaintext password.
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Sign a JWT access token for the given user.
 * Payload: { sub, role, name }
 * @param {{ id: string, role: string, name: string }} user
 * @returns {string}
 */
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

/**
 * Generate a new refresh token tuple.
 * The raw token is sent to the client; only the hash is stored in the DB.
 *
 * @param {string} [existingFamily] – pass to continue a rotation chain;
 *                                    omit (or pass undefined) for a brand-new session.
 * @returns {{ token: string, hash: string, family: string, expiresAt: Date }}
 */
function generateRefreshToken(existingFamily) {
  const token  = crypto.randomBytes(40).toString("hex"); // 80-char hex string
  const hash   = crypto.createHash("sha256").update(token).digest("hex");
  const family = existingFamily || crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTtlDays);

  return { token, hash, family, expiresAt };
}

/**
 * Build the public user object returned to clients.
 * Intentionally omits password_hash, dob (COPPA sensitive), and internal fields.
 * @param {object} row
 * @returns {object}
 */
function formatUser(row) {
  return {
    id:         row.id,
    email:      row.email,
    name:       row.name,
    role:       row.role,
    avatar_url: row.avatar_url || null,
    created_at: row.created_at,
  };
}

// ─── Service functions ────────────────────────────────────────────────────────

/**
 * Register a new user account.
 *
 * COPPA note: if dob is provided and the user is under 13, the account is
 * created but flagged (consent_at = NULL). The parental consent flow
 * (email link) is a separate feature — not blocking here, but the flag
 * is in place for Phase 1 compliance.
 *
 * @param {{ email: string, name: string, password: string, role?: string, dob?: string }} params
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string, refreshExpiresAt: Date }>}
 */
async function register({ email, name, password, role = "kid", dob }) {
  // 1. Duplicate email check
  const exists = await authRepository.emailExists(email);
  if (exists) {
    throw httpError("An account with this email already exists.", 409);
  }

  // 2. COPPA: flag under-13 accounts (parental consent flow hooks in here later)
  let needsParentalConsent = false;
  if (dob) {
    const age = ageFromDob(dob);
    if (age < COPPA_AGE_LIMIT) {
      needsParentalConsent = true;
      // TODO (Phase 1 COPPA): send parental consent email
      // For now we create the account; consent_at stays NULL until the
      // parent clicks the confirmation link.
    }
  }

  // 3. Hash password
  const passwordHash = await hashPassword(password);

  // 4. Persist user
  const userRow = await authRepository.createUser({
    email,
    name,
    passwordHash,
    role,
    dob: dob || null,
  });

  // 5. Issue tokens
  const accessToken  = generateAccessToken(userRow);
  const refreshData  = generateRefreshToken();       // new family for new session

  await authRepository.storeRefreshToken({
    userId:    userRow.id,
    tokenHash: refreshData.hash,
    family:    refreshData.family,
    expiresAt: refreshData.expiresAt,
  });

  return {
    user:              formatUser(userRow),
    accessToken,
    refreshToken:      refreshData.token,
    refreshExpiresAt:  refreshData.expiresAt,
    needsParentalConsent,
  };
}

/**
 * Authenticate an existing user with email + password.
 *
 * Returns a generic 401 on both "email not found" and "wrong password"
 * to prevent user-enumeration attacks.
 *
 * @param {{ email: string, password: string }} params
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string, refreshExpiresAt: Date }>}
 */
async function login({ email, password }) {
  // 1. Look up user — same error whether email is missing or password wrong
  const userRow = await authRepository.findByEmail(email);
  if (!userRow || !userRow.password_hash) {
    throw httpError("Invalid email or password.", 401);
  }

  // 2. Constant-time password comparison (bcrypt handles this)
  const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
  if (!passwordMatch) {
    throw httpError("Invalid email or password.", 401);
  }

  // 3. Issue tokens
  const accessToken = generateAccessToken(userRow);
  const refreshData = generateRefreshToken(); // new family for each login

  await authRepository.storeRefreshToken({
    userId:    userRow.id,
    tokenHash: refreshData.hash,
    family:    refreshData.family,
    expiresAt: refreshData.expiresAt,
  });

  return {
    user:             formatUser(userRow),
    accessToken,
    refreshToken:     refreshData.token,
    refreshExpiresAt: refreshData.expiresAt,
  };
}

/**
 * Rotate a refresh token.
 *
 * Security properties:
 *   - The old token is revoked immediately before the new one is stored.
 *   - If a revoked token is presented (reuse), the entire family is revoked,
 *     forcing the real user to log in again. This limits the damage window
 *     if a refresh token is stolen.
 *   - Expired tokens are rejected before any rotation occurs.
 *
 * @param {string} rawToken – the plain refresh token from the cookie
 * @returns {Promise<{ user: object, accessToken: string, refreshToken: string, refreshExpiresAt: Date }>}
 */
async function refreshTokens(rawToken) {
  if (!rawToken) {
    throw httpError("Refresh token is missing.", 401);
  }

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // 1. Check for an active (non-revoked, non-expired) token
  const activeToken = await authRepository.findActiveRefreshToken(tokenHash);

  if (!activeToken) {
    // Check if the token exists but was already revoked (reuse detection)
    const revokedToken = await authRepository.findAnyRefreshToken(tokenHash);
    if (revokedToken) {
      // Reuse detected — revoke the entire family to protect the real user
      await authRepository.revokeRefreshTokenFamily(revokedToken.family);
    }
    throw httpError("Refresh token is invalid or expired. Please log in again.", 401);
  }

  // 2. Revoke the current token (rotation)
  await authRepository.revokeRefreshToken(tokenHash);

  // 3. Look up the user to embed fresh claims in the new access token
  const userRow = await authRepository.findById(activeToken.user_id);
  if (!userRow) {
    throw httpError("User account not found.", 401);
  }

  // 4. Issue new token pair — continue the same family chain
  const accessToken  = generateAccessToken(userRow);
  const refreshData  = generateRefreshToken(activeToken.family);

  await authRepository.storeRefreshToken({
    userId:    userRow.id,
    tokenHash: refreshData.hash,
    family:    refreshData.family,
    expiresAt: refreshData.expiresAt,
  });

  return {
    user:             formatUser(userRow),
    accessToken,
    refreshToken:     refreshData.token,
    refreshExpiresAt: refreshData.expiresAt,
  };
}

/**
 * Revoke a refresh token (logout).
 * Silently succeeds if the token is already revoked or doesn't exist,
 * so double-logout doesn't produce an error.
 *
 * @param {string} rawToken – the plain refresh token from the cookie
 * @returns {Promise<void>}
 */
async function logout(rawToken) {
  if (!rawToken) return; // nothing to revoke

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await authRepository.revokeRefreshToken(tokenHash);
}

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
};
