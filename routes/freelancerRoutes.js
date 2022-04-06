const express = require("express");
// const userController = require("../controllers/userController");
// const authController = require("../controllers/authController");
const projectController = require("../controllers/projectController");
const freelancerController = require("../controllers/freelancerController");
const RouteService = require("../services/RouteService");
const catchAsync = require("../utils/catchAsync");

const router = express.Router();

router.use(RouteService.protect);
router.use(RouteService.restrictTo("freelancer"));

router
  .route("/freelancer-action-on-porposal")
  .post(projectController.FreelancerActionOnProposal);

router
  .route("/update-milestone-status")
  .get(projectController.UpdateMilestoneStatus);

router
  .route("/make-milestone-widthdrawlRequest")
  .post(projectController.MakeMilestoneWidthdrawlRequest);

router.route("/assignProjects").get(freelancerController.assignProjects);
router.route("/dashboardData").get(freelancerController.dashboardData);
router.route("/newProposals").get(freelancerController.newProposals);
router.route("/allproposals").get(freelancerController.allProposals);

module.exports = router;
