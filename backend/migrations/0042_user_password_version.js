/* eslint-disable camelcase */

/**
 * Migration 0042 — users.password_version
 *
 * Adds a monotonically-increasing counter that lets us invalidate every
 * outstanding access token of a user atomically. Strategy:
 *
 *   - Access JWTs embed { ..., password_version } at issue time.
 *   - verifyToken middleware re-checks the claim against users.password_version
 *     on every request; mismatch → 401 TOKEN_INVALIDATED.
 *   - changePassword (and future password-reset) UPDATEs
 *     password_version = password_version + 1 inside the same transaction
 *     that revokes refresh_tokens.user_id rows.
 *
 * NULL semantics: NOT NULL DEFAULT 1 — existing users get version 1.
 * Tokens issued before this column existed will not carry the claim;
 * the middleware treats `decoded.password_version === undefined` as a
 * grace match (legacy token) for backward compatibility. After
 * config.jwt.refreshTtlDays (~30d) every legacy token will have rotated
 * out naturally; the grace branch can then be removed.
 *
 * Closes 1 P0:
 *   - Audit Wave 1.3: changePassword did not revoke other sessions —
 *     stolen refresh cookie was still usable post-change.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    password_version: {
      type: "integer",
      notNull: true,
      default: 1,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", ["password_version"]);
};
