/**
 * services/emailChangeService.js — Wave 2.10 TRIMMED+ design.
 *
 * Two operations:
 *
 *   changeEmail(userId, currentPassword, newEmail)
 *     - re-auths via bcrypt.compare(currentPassword, password_hash)
 *     - validates email format + collision (active users only)
 *     - delegates the atomic UPDATE/INSERT/revoke to the repository
 *     - signs a 7-day JWT undo token whose jti maps to email_changes
 *       row, fires fire-and-forget notification to the OLD address
 *     - returns nothing useful in HTTP body (controller responds 200)
 *
 *   undoEmailChange(token)
 *     - verifies the JWT (algorithm allowlist, expiry, audience)
 *     - looks up the email_changes row by jti
 *     - delegates the atomic revert + token-revoke
 *     - fires fire-and-forget confirmation email to the restored OLD
 *
 * Threat-model notes (secure-code-guardian):
 *   - Generic 401 message on wrong password — no email enumeration.
 *   - Generic 400 "Email không khả dụng" on collision — no leak that
 *     the address belongs to another user.
 *   - JWT signed with config.jwt.accessSecret + algorithm allowlist
 *     ["HS256"] — same key used for access tokens, well-protected.
 *   - jti single-use enforced at the DB level (undone_at IS NULL),
 *     not by the JWT alone — replay-safe even if the link leaks.
 *   - User soft-delete (Wave 2.7) cascades email_changes rows away
 *     via FK ON DELETE CASCADE.
 *   - Rate limit applied at the route layer (3 successful changes /
 *     24h / user via emailChangeRepository.countChangesSince).
 */

"use strict";

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const config = require("../config");
const { query } = require("../config/db");
const emailChangeRepository = require("../repositories/emailChangeRepository");
const emailService = require("./emailService");

const UNDO_TTL_DAYS = 7;
const UNDO_AUDIENCE = "lingona-email-change-undo";
const RATE_LIMIT_WINDOW_HOURS = 24;
const RATE_LIMIT_MAX = 3;

// RFC 5321 caps the local-part at 64 chars and the full address at 254.
// Accept anything that has a non-empty local + a domain with a dot.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]+$/;

function httpError(message, status, code) {
  const e = new Error(message);
  e.status = status;
  if (code) e.code = code;
  return e;
}

/**
 * Sign the undo token. jti is also stored in email_changes so the
 * server can refuse a leaked token after first use.
 */
function signUndoToken(userId, jti) {
  return jwt.sign(
    { sub: userId, jti, purpose: "email_change_undo" },
    config.jwt.accessSecret,
    {
      algorithm: "HS256",
      audience:  UNDO_AUDIENCE,
      expiresIn: `${UNDO_TTL_DAYS}d`,
    },
  );
}

function verifyUndoToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, {
    algorithms: ["HS256"],
    audience:   UNDO_AUDIENCE,
  });
}

function buildUndoUrl(token) {
  const base = process.env.FRONTEND_URL || "https://lingona.app";
  return `${base}/auth/email-change/undo?token=${encodeURIComponent(token)}`;
}

/**
 * Change the authenticated user's email address.
 *
 * @param {string} userId
 * @param {string} currentPassword
 * @param {string} newEmail
 * @returns {Promise<{ ok: true }>}
 */
async function changeEmail(userId, currentPassword, newEmail) {
  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    throw httpError("Cần nhập mật khẩu hiện tại.", 400, "CURRENT_PASSWORD_REQUIRED");
  }

  // Validate email shape FIRST — generic 400, no echo.
  if (typeof newEmail !== "string" || newEmail.length > 254 || !EMAIL_RE.test(newEmail)) {
    throw httpError("Email không hợp lệ.", 400, "INVALID_EMAIL");
  }

  const lowered = newEmail.trim().toLowerCase();

  // Pull the current row + password_hash for re-auth.
  const r = await query(
    `SELECT email, name, password_hash FROM users
      WHERE id = $1 AND deleted_at IS NULL`,
    [userId],
  );
  if (r.rows.length === 0) {
    throw httpError("Không tìm thấy tài khoản.", 404);
  }
  const user = r.rows[0];

  if (!user.password_hash) {
    throw httpError("Tài khoản chưa có mật khẩu — không thể đổi email qua flow này.",
      400, "NO_PASSWORD_SET");
  }

  // Constant-time compare — wrong password is the same generic
  // 401 the login endpoint emits.
  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) {
    throw httpError("Mật khẩu hiện tại không đúng.", 401, "CURRENT_PASSWORD_WRONG");
  }

  // No-op guard: changing to the same address.
  if (user.email && user.email.toLowerCase() === lowered) {
    throw httpError("Email mới phải khác email hiện tại.", 400, "EMAIL_UNCHANGED");
  }

  // Rate limit: 3 successful changes per 24h.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_HOURS * 3600 * 1000).toISOString();
  const recentCount = await emailChangeRepository.countChangesSince(userId, since);
  if (recentCount >= RATE_LIMIT_MAX) {
    throw httpError(
      `Bạn đã đổi email ${recentCount} lần trong ${RATE_LIMIT_WINDOW_HOURS} giờ qua. Thử lại sau.`,
      429,
      "EMAIL_CHANGE_RATE_LIMIT",
    );
  }

  // The jti is the source of truth for single-use undo. Sign the JWT
  // with the same value — no other column references it.
  const jti = crypto.randomUUID();

  const change = await emailChangeRepository.applyChange(userId, user.email, lowered, jti);
  // Anything thrown by applyChange (collision, race) propagates with
  // status + code; controller forwards.

  const undoToken = signUndoToken(userId, jti);
  const undoUrl   = buildUndoUrl(undoToken);

  // Fire-and-forget so a Resend hiccup doesn't 5xx the user-facing
  // request; the email-change is already committed.
  emailService.sendEmailChangeNotification(
    { email: user.email, name: user.name },
    lowered,
    undoUrl,
  ).catch((err) => {
    console.error(`[email-change] notification failed user=${userId}:`, err.message);
  });

  console.warn(
    `[email-change] user=${userId} change_id=${change.id} ` +
    `pv=${change.new_password_version} (sessions revoked)`,
  );

  return { ok: true };
}

/**
 * Consume an undo token.
 *
 * @param {string} token — raw JWT from the URL
 * @returns {Promise<{ ok: true, restored_email: string }>}
 */
async function undoEmailChange(token) {
  if (typeof token !== "string" || token.length === 0) {
    throw httpError("Token không hợp lệ.", 400, "INVALID_TOKEN");
  }

  let payload;
  try {
    payload = verifyUndoToken(token);
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      throw httpError("Liên kết đã hết hạn.", 400, "UNDO_TOKEN_EXPIRED");
    }
    throw httpError("Token không hợp lệ.", 400, "INVALID_TOKEN");
  }

  if (payload.purpose !== "email_change_undo" || typeof payload.jti !== "string") {
    throw httpError("Token không hợp lệ.", 400, "INVALID_TOKEN");
  }

  const result = await emailChangeRepository.applyUndo(payload.jti);
  if (!result) {
    // Either already consumed, or current email no longer matches the
    // recorded new_email (user changed AGAIN), or user was deleted.
    // All paths surface as the same 409 — no info leak.
    throw httpError(
      "Liên kết khôi phục không còn hiệu lực.",
      409,
      "UNDO_NOT_AVAILABLE",
    );
  }

  // Fetch the restored row to get name for the confirmation email.
  const r = await query(
    `SELECT name FROM users WHERE id = $1`,
    [result.user_id],
  );
  const name = r.rows[0]?.name ?? null;

  emailService.sendEmailUndoConfirmation({
    email: result.restored_email,
    name,
  }).catch((err) => {
    console.error(`[email-change] undo confirmation failed user=${result.user_id}:`, err.message);
  });

  console.warn(`[email-change] UNDO user=${result.user_id} restored=<redacted>`);

  return { ok: true, restored_email: result.restored_email };
}

module.exports = {
  changeEmail,
  undoEmailChange,
  // exposed for tests only
  __internal: { signUndoToken, verifyUndoToken, buildUndoUrl, EMAIL_RE, UNDO_AUDIENCE },
};
