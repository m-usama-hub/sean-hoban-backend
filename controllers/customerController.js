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

const GetMilestonesRequestedForRelease = async (limit, skip, req) => {
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
        "milestones.makeReleaseRequest": true,
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
        as: "customer",
      },
    },
    { $unwind: "$customer" },
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
        requestedAt: milestone.releaseRequestedAt,
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
            _id: proposal.customer._id,
            name: proposal.customer.name,
            role: proposal.customer.role,
          },
        },
      });
    });
  });

  return milestones;
};

const myProjects = async (user, pageNum, pageLimit, status) => {
  const page = pageNum * 1 || 1;
  const limit = pageLimit * 1 || 400;
  const skip = (page - 1) * limit;
  let query = { postedBy: user._id };

  if (status && status != "all") query = { ...query, projectStatus: status };

  let projects = await Project.find(query)
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
    .populate("projectId")
    .skip(0)
    .limit(4);

  let projects = await myProjects(req.user);

  let payments = await GetMilestonesRequestedForRelease(2, 0, req);

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
    data: await myProjects(req.user, page, limit, req.query.status),
    recordsLimit: countDocs,
  });
});

exports.payments = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let payments = await Payment.find({ userId: req.user._id })
    .sort("-createdAt")
    .populate("projectId")
    .skip(skip)
    .limit(limit);

  let countDocs = await Payment.countDocuments({ userId: req.user._id });

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
  let payments = await GetMilestonesRequestedForRelease(limit, skip, req);

  let countDocs = await GetMilestonesRequestedForRelease("*", 0, req);

  res.status(200).json({
    status: "success",
    data: payments,
    recordsLimit: countDocs.length,
  });
});
