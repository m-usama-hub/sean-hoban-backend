const express = require("express");
const {
  seenNotifiation,
  getMyNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
} = require("../controllers/notificationController");
const RouteService = require("../services/RouteService");

const router = express.Router();
// Protect all routes after this middleware
router.use(RouteService.protect);

router.route("/").post(createNotification);
router.route("/all").get(getMyNotifications);

router.route("/seen").get(seenNotifiation);
router.route("/:id").patch(updateNotification).delete(deleteNotification);

module.exports = router;
