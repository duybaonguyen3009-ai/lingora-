"use strict";

const { query } = require("../config/db");

async function getSubscription(userId) {
  const result = await query(
    `SELECT id, is_pro, trial_expires_at, subscription_expires_at,
            next_billing_date, auto_renew
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [userId]
  );
  return result.rows[0] || null;
}

async function updateAutoRenew(userId, autoRenew) {
  const result = await query(
    `UPDATE users
     SET auto_renew = $2, updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, is_pro, trial_expires_at, subscription_expires_at,
               next_billing_date, auto_renew`,
    [userId, autoRenew]
  );
  return result.rows[0] || null;
}

module.exports = { getSubscription, updateAutoRenew };
