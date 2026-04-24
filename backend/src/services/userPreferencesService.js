"use strict";

const userPreferencesRepository = require("../repositories/userPreferencesRepository");

const ALLOWED_KEYS = new Set(["target_band", "exam_date", "daily_xp_goal", "notifications"]);
const ALLOWED_NOTIF = new Set(["push", "email", "streak_reminder", "battle_invite"]);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function validatePatch(patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw httpError(400, "Body must be an object");
  }

  for (const key of Object.keys(patch)) {
    if (!ALLOWED_KEYS.has(key)) throw httpError(400, `Unknown preference key: ${key}`);
  }

  if ("target_band" in patch) {
    const v = patch.target_band;
    if (v !== null && (typeof v !== "number" || v < 1.0 || v > 9.0 || (v * 2) % 1 !== 0)) {
      throw httpError(400, "target_band must be 1.0-9.0 in 0.5 steps");
    }
  }

  if ("exam_date" in patch) {
    if (patch.exam_date !== null) {
      if (typeof patch.exam_date !== "string" || isNaN(Date.parse(patch.exam_date))) {
        throw httpError(400, "exam_date must be ISO date string or null");
      }
    }
  }

  if ("daily_xp_goal" in patch) {
    const v = patch.daily_xp_goal;
    if (!Number.isInteger(v) || v < 10 || v > 500) {
      throw httpError(400, "daily_xp_goal must be integer 10-500");
    }
  }

  if ("notifications" in patch) {
    const n = patch.notifications;
    if (!n || typeof n !== "object" || Array.isArray(n)) {
      throw httpError(400, "notifications must be object");
    }
    for (const key of Object.keys(n)) {
      if (!ALLOWED_NOTIF.has(key)) throw httpError(400, `Unknown notification key: ${key}`);
      if (typeof n[key] !== "boolean") throw httpError(400, `notifications.${key} must be boolean`);
    }
  }
}

async function getPreferences(userId) {
  return userPreferencesRepository.getPreferences(userId);
}

async function updatePreferences(userId, patch) {
  validatePatch(patch);
  return userPreferencesRepository.mergePreferences(userId, patch);
}

module.exports = { getPreferences, updatePreferences };
