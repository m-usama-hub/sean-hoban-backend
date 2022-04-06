const multer = require("multer");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const Proposal = require("../models/proposalModel");
const Payment = require("../models/paymentModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerFactory");
const AppError = require("../utils/appError");
const { filterObj } = require("../utils/fn");
const ProjectService = require("../services/ProjectService");
const StripeService = require("../services/StripeService");
const moment = require("moment");
const { CourierClient } = require("@trycourier/courier");

const GetAssignedProjects = async () => {
  return await Project.find({ isAssigned: true })
    .select({
      porposalsForCustomer: 0,
      porposalsForFreelancer: 0,
      accecptedPorposalByCustomer: 0,
      accecptedPorposalByFreelancer: 0,
    })
    .sort("-createdAt")
    .populate("assignTo", { name: 1, role: 1 });
};

const GetMilestonesRequestedForWidthdrawl = async () => {
  let proposals = await Proposal.aggregate([
    {
      $match: {
        status: "accepted",
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
        "milestones.isMilestonePaid": false,
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

  //   return proposals;

  let milestones = [];

  proposals.forEach(function (proposal) {
    proposal.milestones.forEach(function (milestone) {
      milestones.push({
        status: milestone.isMilestonePaid ? "Paid" : "Pending",
        amount: milestone.amount,
        title: milestone.title,
        _id: milestone._id,
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

const GetEarningsPerWeekDays = async () => {
  return await Payment.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(moment().add(-6, "days").format()),
          $lte: new Date(moment().format()),
        },
        isPaymentVerified: true,
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        amount: { $sum: "$amount" },
      },
    },
  ]);
};

const GetWebsiteStats = async () => {
  let Earnings = await Project.aggregate([
    {
      $match: {
        // projectStatus: "completed",
      },
    },
    {
      $group: {
        _id: "$currency",
        // currency: { $first: "$currency" },
        amount: { $sum: "$amountPayedToAdmin" },
      },
    },
    // {
    //   $project: {
    //     _id: 0,
    //     total: { $sum: "$amount" },
    //     currency: "$currency",
    //   },
    // },
  ]);

  let payments = "38k";

  return {
    Total: await Project.count(),
    Assigned: await Project.find({ isAssigned: true }).count(),
    "Open to work": await Project.find({ status: "underReview" }).count(),
    "Awaiting Payments": payments,
    Completed: await Project.find({ status: "completed" }).count(),
    Earnings,
  };
};

exports.dashboardData = catchAsync(async (req, res, next) => {
  let data = {};

  data.assignedProjects = await GetAssignedProjects();
  data.widthdrawlRequests = await GetMilestonesRequestedForWidthdrawl();
  data.GraphData = await GetEarningsPerWeekDays();
  data.WebsiteStats = await GetWebsiteStats();

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.payments = catchAsync(async (req, res, next) => {
  let payments = await Payment.find()
    .populate("projectId")
    .sort("-createdAt")
    .populate("userId");

  res.status(200).json({
    status: "success",
    data: payments,
  });
});

exports.widthdrawlRequests = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: GetMilestonesRequestedForWidthdrawl(),
  });
});

exports.getAssignProject = catchAsync(async (req, res, next) => {
  let data = await GetAssignedProjects();

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getPostedProjects = catchAsync(async (req, res, next) => {
  let data = await Project.find().sort("-createdAt");

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getAllWorkers = catchAsync(async (req, res, next) => {
  let users = await User.find({ role: "customer" })
    .select({
      fcmToken: 0,
      password: 0,
      passwordConfirm: 0,
      passwordChangedAt: 0,
      passwordResetToken: 0,
      passwordResetExpires: 0,
      cus: 0,
    })
    .sort("-createdAt");

  res.status(200).json({
    status: "success",
    data: users,
  });
});

exports.getAllContractor = catchAsync(async (req, res, next) => {
  let users = await User.find({ role: "freelancer" })
    .select({
      fcmToken: 0,
      password: 0,
      passwordConfirm: 0,
      passwordChangedAt: 0,
      passwordResetToken: 0,
      passwordResetExpires: 0,
      cus: 0,
    })
    .sort("-createdAt");
  res.status(200).json({
    status: "success",
    data: users,
  });
});

exports.getMessage = catchAsync(async (req, res, next) => {
  let courier = CourierClient({
    authorizationToken: process.env.COURIER_CLIENT_KRY,
  });
  const messageStatus = await courier.getMessage(req.query.requestId);
  console.log({ messageStatus });
  res.status(200).json({
    status: "success",
    data: messageStatus,
  });
});
