/* eslint-disable camelcase */

/**
 * Migration 0038 — Settings + subscription metadata
 *
 * Adds:
 *   - preferences JSONB (flexible container for target_band, exam_date,
 *     daily_xp_goal, notifications.* toggles)
 *   - auto_renew, subscription_expires_at, next_billing_date — stubs for
 *     MoMo integration flow (launch blocker). auto_renew defaults to true
 *     per product decision (industry standard, matches yearly "best value" pricing).
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns("users", {
    preferences: {
      type: "jsonb",
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
    auto_renew: {
      type: "boolean",
      notNull: true,
      default: true,
    },
    subscription_expires_at: { type: "timestamptz" },
    next_billing_date: { type: "timestamptz" },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", [
    "preferences",
    "auto_renew",
    "subscription_expires_at",
    "next_billing_date",
  ]);
};
