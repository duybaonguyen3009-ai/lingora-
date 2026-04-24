"use strict";

const subscriptionService = require("../services/subscriptionService");
const { sendSuccess, sendError } = require("../response");

async function handleGetSubscription(req, res, next) {
  try {
    const data = await subscriptionService.getSubscription(req.user.id);
    if (!data) return sendError(res, { status: 404, message: "User not found" });
    return sendSuccess(res, { data });
  } catch (err) { next(err); }
}

async function handleToggleRenew(req, res, next) {
  try {
    const data = await subscriptionService.toggleAutoRenew(req.user.id);
    if (!data) return sendError(res, { status: 404, message: "User not found" });
    return sendSuccess(res, { data });
  } catch (err) { next(err); }
}

async function handleApplyPromo(req, res) {
  return sendError(res, {
    status: 501,
    message: "Mã khuyến mãi sẽ khả dụng sau ngày 15/05/2026",
  });
}

module.exports = { handleGetSubscription, handleToggleRenew, handleApplyPromo };
