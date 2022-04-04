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

const myProjects = async (user) => {
  let projects = await Project.find({
    postedBy: user._id,
  })
    // .select({
    //   porposalsForCustomer: 0,
    //   porposalsForFreelancer: 0,
    //   accecptedPorposalByCustomer: 0,
    //   accecptedPorposalByFreelancer: 0,
    // })
    .populate('porposalsForCustomer')
    .populate('accecptedPorposalByCustomer')
    .populate('postedBy')
    .populate('assignTo')
    .sort("-createdAt");

  return projects;
};

exports.dashboardData = catchAsync(async (req, res, next) => {
  let newProposals = await Proposal.find({
    status: "active",
    sendTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("projectId");

  let projects = await myProjects(req.user);

  let payments = await Payment.find({ userId: req.user._id })
    .sort("-createdAt")
    .populate("projectId");

  res.status(200).json({
    status: "success",
    data: { newProposals, projects, payments },
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

exports.myProjects = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: await myProjects(req.user),
  });
});
