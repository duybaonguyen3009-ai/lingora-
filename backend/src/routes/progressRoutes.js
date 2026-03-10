const { Router } = require("express");
const progressController = require("../controllers/progressController");

const router = Router();

router.post("/lessons/:lessonId/complete", progressController.completeLesson);
router.get("/users/:userId/progress",      progressController.getProgress);

module.exports = router;
