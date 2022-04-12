const express = require("express");

const {
  getPageData,
  addPageData,
  updatePageData,
  deletePageData
} = require("../controllers/pageCrudController");
const RouteService = require("../services/RouteService");
const { uploadUserFiles } = require("../utils/s3");

const router = express.Router();

// Protect all routes after this middleware
// router.use(authController.protect);

router.route("/").get(getPageData);

router.use(RouteService.protect);
router.use(RouteService.restrictTo("admin", "super-admin"));

router.route("/").post(uploadUserFiles, addPageData);

router
  .route("/:id")
  .patch(uploadUserFiles, updatePageData)
  .delete(deletePageData);

module.exports = router;
