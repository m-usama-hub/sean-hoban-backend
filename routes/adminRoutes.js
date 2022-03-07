const express = require("express");
// const userController = require("../controllers/userController");
// const authController = require("../controllers/authController");
const projectController = require("../controllers/projectController");
const adminController = require("../controllers/adminController");
const RouteService = require("../services/RouteService");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

router.use(RouteService.protect);
router.use(RouteService.restrictTo("admin", "super-admin"));

router
  .route("/submit-porposal-to-customer")
  .post(projectController.submitPurposalToCustomer);

router
  .route("/submit-porposal-to-freelancer")
  .post(projectController.submitPurposalToFreelancer);

router
  .route("/update-milestone-payment-status")
  .post(projectController.updateMilestonePaymentStatus);

router
  .route("/update-customer-milestone-status")
  .get(projectController.UpdateMilestoneStatus);

router
  .route("/make-milestone-release-request")
  .post(projectController.MakeMilestoneReleaseRequest);

router.route("/dashboardData").get(adminController.dashboardData);

router.route("/payments").get(adminController.payments);
router.route("/assignProject").get(adminController.getAssignProject);
router.route("/postedProjects").get(adminController.getPostedProjects);
router.route("/projectDetails").get(adminController.getProjectDetails);
router.route("/workers").get(adminController.getAllWorkers);
router.route("/contractors").get(adminController.getAllContractor);

router.route("/get-email-status").get(adminController.getMessage);

module.exports = router;
