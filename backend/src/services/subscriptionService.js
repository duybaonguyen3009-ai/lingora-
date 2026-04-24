"use strict";

const subscriptionRepository = require("../repositories/subscriptionRepository");

function deriveTier(row) {
  if (row.is_pro) return "pro";
  if (row.trial_expires_at && new Date(row.trial_expires_at) > new Date()) return "trial";
  return "free";
}

function shape(row) {
  const tier = deriveTier(row);
  return {
    tier,
    is_pro: row.is_pro,
    is_trial: tier === "trial",
    trial_expires_at: row.trial_expires_at,
    subscription_expires_at: row.subscription_expires_at,
    next_billing_date: row.next_billing_date,
    auto_renew: row.auto_renew,
  };
}

async function getSubscription(userId) {
  const row = await subscriptionRepository.getSubscription(userId);
  return row ? shape(row) : null;
}

async function toggleAutoRenew(userId) {
  const current = await subscriptionRepository.getSubscription(userId);
  if (!current) return null;
  const updated = await subscriptionRepository.updateAutoRenew(userId, !current.auto_renew);
  return updated ? shape(updated) : null;
}

module.exports = { getSubscription, toggleAutoRenew };
