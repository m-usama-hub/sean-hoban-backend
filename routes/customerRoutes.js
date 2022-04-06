const express = require("express");
// const userController = require("../controllers/userController");
const CustomerController = require("../controllers/customerController");
const projectController = require("../controllers/projectController");
const RouteService = require("../services/RouteService");
const catchAsync = require("../utils/catchAsync");
const {
  uploadUserImage,
  uploadUserPDfs,
  uploadUserFiles,
} = require("../utils/s3");

const router = express.Router();

router.use(RouteService.protect);
router.use(RouteService.restrictTo("customer"));

router
  .route("/customer-action-on-porposal")
  .post(projectController.CustomerActionOnProposal);

router
  .route("/customer-Pay-to-admin")
  .post(projectController.CustomerPayToAdmin);

router
  .route("/post-project")
  .post(uploadUserFiles, projectController.createProject);

router
  .route("/get-project-proposals")
  .get(projectController.getProjectProposals);

router.route("/myProjects").get(CustomerController.myProjects);
router.route("/dashboardData").get(CustomerController.dashboardData);
router.route("/newProposals").get(CustomerController.newProposals);
router.route("/payments").get(CustomerController.payments);

module.exports = router;
