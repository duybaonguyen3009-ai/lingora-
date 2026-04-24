"use strict";

const userPreferencesService = require("../services/userPreferencesService");
const { sendSuccess, sendError } = require("../response");

async function handleGetPreferences(req, res, next) {
  try {
    const data = await userPreferencesService.getPreferences(req.user.id);
    if (data === null) return sendError(res, { status: 404, message: "User not found" });
    return sendSuccess(res, { data });
  } catch (err) { next(err); }
}

async function handlePatchPreferences(req, res, next) {
  try {
    const data = await userPreferencesService.updatePreferences(req.user.id, req.body);
    if (data === null) return sendError(res, { status: 404, message: "User not found" });
    return sendSuccess(res, { data });
  } catch (err) {
    if (err.status) return sendError(res, { status: err.status, message: err.message });
    next(err);
  }
}

module.exports = { handleGetPreferences, handlePatchPreferences };
