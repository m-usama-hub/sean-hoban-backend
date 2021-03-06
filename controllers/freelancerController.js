const multer = require("multer");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const Proposal = require("../models/proposalModel");
const Chatroom = require("../models/roomModel");
const Payment = require("../models/paymentModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerFactory");
const AppError = require("../utils/appError");
const { filterObj } = require("../utils/fn");
const ProjectService = require("../services/ProjectService");
const StripeService = require("../services/StripeService");

exports.dashboardData = catchAsync(async (req, res, next) => {
  let newProposals = await Proposal.find({
    status: "active",
    sendTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("projectId");

  let assignProjects = await Project.find({
    isAssigned: true,
    assignTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("accecptedPorposalByFreelancer");

  let payments = await Payment.find({ reciverId: req.user._id })
    .sort("-createdAt")
    .populate("projectId");

  res.status(200).json({
    status: "success",
    data: { newProposals, assignProjects, payments },
  });
});

exports.newProposals = catchAsync(async (req, res, next) => {
  let newProposals = await Proposal.find({
    status: "active",
    sendTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("projectId");

  res.status(200).json({
    status: "success",
    data: newProposals,
  });
});

exports.allProposals = catchAsync(async (req, res, next) => {
  let newProposals = await Proposal.find({
    sendTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("projectId");

  res.status(200).json({
    status: "success",
    data: newProposals,
  });
});

exports.assignProjects = catchAsync(async (req, res, next) => {
  let projects = await Project.find({
    isAssigned: true,
    assignTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("porposalsForFreelancer")
    .populate("accecptedPorposalByFreelancer");

  res.status(200).json({
    status: "success",
    data: projects,
  });
});
