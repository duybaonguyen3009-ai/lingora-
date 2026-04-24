"use strict";

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const ctrl = require("../controllers/subscriptionController");

const router = Router();

router.use(verifyToken);

router.get("/", ctrl.handleGetSubscription);
router.post("/toggle-renew", ctrl.handleToggleRenew);
router.post("/apply-promo", ctrl.handleApplyPromo);

module.exports = router;
