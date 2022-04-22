const express = require("express");
const {
  getPage,
  updatePage,
  getDynamicPage,
  getAllservices,
  getservices,
  postservices,
  updateservices,
  deleteservices,
  getPageSeoData,
  postPageSeoData,
} = require("../controllers/cmsController");
const { uploadUserFiles } = require("../utils/s3");
const RouteService = require("../services/RouteService");

const router = express.Router();

router.get("/web/all-services", getAllservices);

// SEO Routes
router
  .route("/seo/:pageName")
  .get(getPageSeoData)
  .post(uploadUserFiles, postPageSeoData);

// Web services Routes
router
  .route("/web/services")
  .get(getservices)
  // S3 changes applied
  .post(
    // userController.uploadUserPhoto,
    uploadUserFiles,
    postservices
  );

router
  .route("/web/services/:id?")
  // S3 changes applied
  .patch(
    // userController.uploadUserPhoto,
    uploadUserFiles,
    updateservices
  )
  .delete(deleteservices);

router.route("/pages/all").get(getDynamicPage);

router.get("/page/:page", getPage);

// router.route("/get-page/:page").get(adminController.getPage);

router.use(RouteService.protect);
router.use(RouteService.restrictTo("admin", "super-admin"));

router.post("/page/update", uploadUserFiles, updatePage);

module.exports = router;
