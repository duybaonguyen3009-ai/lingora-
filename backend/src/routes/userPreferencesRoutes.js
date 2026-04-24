"use strict";

const { Router } = require("express");
const { verifyToken } = require("../middleware/auth");
const ctrl = require("../controllers/userPreferencesController");

const router = Router();

router.use(verifyToken);

router.get("/", ctrl.handleGetPreferences);
router.patch("/", ctrl.handlePatchPreferences);

module.exports = router;
