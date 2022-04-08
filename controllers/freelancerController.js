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

const GetMilestonesRequestedForWidthdrawl = async (limit, skip, req) => {
  let pros = Proposal.aggregate([
    {
      $match: {
        status: "accepted",
        sendTo: req.user._id,
      },
    },
    {
      $project: {
        milestones: {
          $filter: {
            input: "$milestones",
            as: "milestones",
            cond: {
              $eq: ["$$milestones.status", "completed"],
            },
          },
        },
        projectId: 1,
        sendTo: 1,
        title: 1,
        createdAt: 1,
      },
    },
    {
      $match: {
        "milestones.makeWidthDrawlRequest": true,
      },
    },
    { $unwind: "$projectId" },
    {
      $lookup: {
        from: "projects",
        localField: "projectId",
        foreignField: "_id",
        as: "project",
      },
    },
    { $unwind: "$project" },
    { $unwind: "$sendTo" },
    {
      $lookup: {
        from: "users",
        localField: "sendTo",
        foreignField: "_id",
        as: "freelancer",
      },
    },
    { $unwind: "$freelancer" },
    { $sort: { createdAt: -1 } },
  ]);

  if (limit != "*") {
    pros.skip(skip).limit(limit);
  }

  let proposals = await pros;

  //   return proposals;

  let milestones = [];

  proposals.forEach(function (proposal) {
    proposal.milestones.forEach(function (milestone) {
      milestones.push({
        milestoneStatus: milestone.isMilestonePaid ? "Paid" : "Pending",
        milestoneDetails: milestone,
        requestedAt: milestone.widthDrawlRequestedAt,
        proposalDetail: {
          proposalId: proposal._id,
          proposalTitle: proposal.title,
        },
        projectDetail: {
          projectId: proposal.project._id,
          projectTitle: proposal.project.title,
          projectAmount: proposal.project.amount,
          projectCurrency: proposal.project.currency,
          assignTo: {
            _id: proposal.freelancer._id,
            name: proposal.freelancer.name,
            role: proposal.freelancer.role,
          },
        },
      });
    });
  });

  return milestones;
};

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
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let projects = await Project.find({
    isAssigned: true,
    assignTo: req.user._id,
  })
    .sort("-createdAt")
    .populate("porposalsForFreelancer")
    .populate("accecptedPorposalByFreelancer")
    .skip(skip)
    .limit(limit);

  let countDocs = await Project.countDocuments({
    isAssigned: true,
    assignTo: req.user._id,
  });

  res.status(200).json({
    status: "success",
    data: projects,
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
