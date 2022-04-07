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

const myProjects = async (user, pageNum, pageLimit) => {
  const page = pageNum * 1 || 1;
  const limit = pageLimit * 1 || 400;
  const skip = (page - 1) * limit;
  let projects = await Project.find({
    postedBy: user._id,
  })
    // .select({
    //   porposalsForCustomer: 0,
    //   porposalsForFreelancer: 0,
    //   accecptedPorposalByCustomer: 0,
    //   accecptedPorposalByFreelancer: 0,
    // })
    .populate("porposalsForCustomer")
    .populate("accecptedPorposalByCustomer")
    .populate("postedBy")
    .populate("assignTo")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

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
  const page = req.query.page;
  const limit = req.query.limit;
  let countDocs = await Project.countDocuments({
    postedBy: req.user._id,
  });
  res.status(200).json({
    status: "success",
    data: await myProjects(req.user, page, limit),
    recordsLimit: countDocs,
  });
});

exports.payments = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let payments = await Payment.find({ reciverId: req.user._id })
    .sort("-createdAt")
    .populate("projectId")
    .skip(skip)
    .limit(limit);

  let countDocs = await Payment.countDocuments({ reciverId: req.user._id });

  res.status(200).json({
    status: "success",
    data: payments,
    recordsLimit: countDocs,
  });
});

exports.invoice = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let payments = await Payment.find({ reciverId: req.user._id })
    .sort("-createdAt")
    .populate("projectId")
    .skip(skip)
    .limit(limit);

  let countDocs = await Payment.countDocuments({ reciverId: req.user._id });

  res.status(200).json({
    status: "success",
    data: payments,
    recordsLimit: countDocs,
  });
});
