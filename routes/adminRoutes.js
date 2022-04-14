const express = require("express");
// const userController = require("../controllers/userController");
// const authController = require("../controllers/authController");
const projectController = require("../controllers/projectController");
const adminController = require("../controllers/adminController");
const cmsController = require("../controllers/cmsController");
const RouteService = require("../services/RouteService");
const catchAsync = require("../utils/catchAsync");
const { uploadUserFiles } = require("../utils/s3");

const router = express.Router();

router.use(RouteService.protect);
router.use(RouteService.restrictTo("admin", "super-admin"));

router
  .route("/submit-porposal-to-customer")
  .post(uploadUserFiles, projectController.submitPurposalToCustomer);

router
  .route("/submit-porposal-to-freelancer")
  .post(uploadUserFiles, projectController.submitPurposalToFreelancer);

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
router.route("/getGraphData").get(adminController.getGraphData);

router.route("/payments").get(adminController.payments);
router.route("/widthdrawlRequests").get(adminController.widthdrawlRequests);
router.route("/assignProject").get(adminController.getAssignProject);
router.route("/postedProjects").get(adminController.getPostedProjects);
// router.route("/projectDetails").get(adminController.getProjectDetails);
router.route("/workers").get(adminController.getAllWorkers);
router.route("/contractors").get(adminController.getAllContractor);

router.route("/get-latest-messages").get(adminController.getlatestMessage);


router.route("/get-email-status").get(adminController.getMessage);

router
  .route("/update-freelancer-status")
  .post(adminController.updateFreelancerStatus);

//==============================================

//CMS

router.route("/pages/all").get(adminController.getDynamicPage);

router.route("/get-page/:page").get(adminController.getPage);

router.post("/page/update", uploadUserFiles, adminController.updatePage);

// Web services Routes
router
  .route("/web/services")
  .get(cmsController.getservices)
  .post(uploadUserFiles, cmsController.postservices);

router
  .route("/web/services/:id?")
  // S3 changes applied
  .post(uploadUserFiles, cmsController.updateservices)
  .delete(cmsController.deleteservices);

// Web Config Routes
// router
//   .route("/web/configs")
//   .get(cmsController.getconfig)
//   .post(cmsController.postconfigs)
//   .patch(cmsController.updateconfigs)
//   .delete(cmsController.deleteconfigs);

// Web FAQ Routes
// router
//   .route("/web/faq/:id?")
//   .get(cmsController.getfaq)
//   .post(cmsController.postfaq)
//   .patch(cmsController.updatefaq)
//   .delete(cmsController.deletefaq);

module.exports = router;
