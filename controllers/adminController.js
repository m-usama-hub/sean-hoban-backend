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
const notification = require("../services/NotificationService");
const moment = require("moment");
const { CourierClient } = require("@trycourier/courier");
const CMS = require("../models/cmsModel");
const Chat = require("../models/chatModel");
const { deleteFile } = require("../utils/s3");

const GetAssignedProjects = async (limit, skip) => {
  let pros = Project.find({ isAssigned: true })
    .select({
      porposalsForCustomer: 0,
      porposalsForFreelancer: 0,
      accecptedPorposalByCustomer: 0,
      accecptedPorposalByFreelancer: 0,
    })
    .sort("-createdAt")
    .populate("assignTo", { name: 1, role: 1 });

  if (limit != "*") {
    pros.skip(skip).limit(limit);
  }

  return await pros;
};

const GetMilestonesRequestedForWidthdrawl = async (limit, skip) => {
  let pros = Proposal.aggregate([
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

  if (limit != "*") {
    pros.skip(skip).limit(limit);
  }

  let proposals = await pros;

  //   return proposals;

  let milestones = [];

  proposals.forEach(function (proposal) {
    proposal.milestones.forEach(function (milestone) {
      milestones.push({
        status: milestone.isMilestonePaid ? "Paid" : "Pending",
        amount: milestone.amount,
        title: milestone.title,
        _id: milestone._id,
        invoice: milestone?.invoice,
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

const GetEarningsPerWeekDays = async (pre, curr, currency) => {
  // console.log({ pre, curr });

  return await Payment.aggregate([
    {
      $match: {
        createdAt: {
          $gte: new Date(moment(pre).format()),
          $lte: new Date(moment(curr).format()),
        },
        isPaymentVerified: true,
        currency: currency,
      },
    },
    // {
    //   $lookup: {
    //     from: Project.collection.name,
    //     localField: "projectId",
    //     foreignField: "_id",
    //     let: { currency: "$currency" },
    //     pipeline: [
    //       {
    //         $match: {
    //           $expr: {
    //             $eq: ["$currency", "$$currency"],
    //           },
    //         },
    //       },
    //     ],
    //     as: "project",
    //   },
    // },
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
    // "Awaiting Payments": payments,
    Completed: await Project.find({ status: "completed" }).count(),
    Earnings,
  };
};

exports.dashboardData = catchAsync(async (req, res, next) => {
  let data = {};

  data.assignedProjects = await GetAssignedProjects(4, 0);
  data.widthdrawlRequests = await GetMilestonesRequestedForWidthdrawl(2, 0);
  data.GraphData = await GetEarningsPerWeekDays(
    new Date(moment().add(-6, "days").format()),
    new Date(moment().format())
  );
  data.WebsiteStats = await GetWebsiteStats();

  console.log({ "loggin User": req.user });
  data.msg = await Chat.find({
    to: req.user._id,
  })
    .populate({
      path: "room",
      populate: {
        path: "projectId",
        model: "Project",
      },
    })
    .populate("from")
    .sort("-createdAt")
    .skip(0)
    .limit(5);

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getGraphData = catchAsync(async (req, res, next) => {
  let { pre, curr, currency } = req.query;

  let data = {};

  data.GraphData = await GetEarningsPerWeekDays(pre, curr, currency);

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.payments = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let payments = await Payment.find()
    .populate("projectId")
    .sort("-createdAt")
    .populate("userId")
    .populate("reciverId")
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: "success",
    data: payments,
    recordsLimit: await Payment.countDocuments(),
  });
});

exports.widthdrawlRequests = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let data = await GetMilestonesRequestedForWidthdrawl(limit, skip);
  let all = await GetMilestonesRequestedForWidthdrawl("*", 0);

  res.status(200).json({
    status: "success",
    data,
    recordsLimit: all.length,
  });
});

exports.getAssignProject = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let data = await GetAssignedProjects(limit, skip);
  let all = await GetAssignedProjects("*", 0);

  res.status(200).json({
    status: "success",
    data,
    recordsLimit: all.length,
  });
});

exports.getPostedProjects = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
  let data = await Project.find().sort("-createdAt").skip(skip).limit(limit);

  res.status(200).json({
    status: "success",
    data,
    recordsLimit: await Project.countDocuments(),
  });
});

exports.getAllWorkers = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
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
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: "success",
    data: users,
    recordsLimit: await User.countDocuments({ role: "customer" }),
  });
});

exports.updateFreelancerStatus = catchAsync(async (req, res, next) => {
  const requiredFromRequest = ["freelancerId", "status"];

  let dataInRequest = { ...req.query, ...req.body };

  await ProjectService.checkRequiredData(
    dataInRequest,
    requiredFromRequest,
    next
  );

  const { freelancerId, status } = {
    ...req.query,
    ...req.body,
  };

  let user = await User.findById(freelancerId);

  if (user.role != "freelancer") {
    return next(new AppError("User is not a freelancer.", 403));
  }

  let newUser = await User.findByIdAndUpdate(
    freelancerId,
    {
      status,
      active: status == "accepted" ? true : false,
      deactivate: status != "accepted" ? true : false,
    },
    { new: true }
  );

  await notification.dispatch(
    {
      type: "user",
      message: "your account has been " + status + " by admin.",
      receiver: freelancerId,
      title: "Your account status updated by admin.",
      typeId: freelancerId,
    },
    req
  );

  res.status(200).json({
    status: "success",
    data: newUser,
  });
});

exports.getAllContractor = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 400;
  const skip = (page - 1) * limit;
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
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: "success",
    data: users,
    recordsLimit: await User.countDocuments({ role: "freelancer" }),
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

exports.getDynamicPage = catchAsync(async (req, res, next) => {
  let {
    pages,
    goals,
    service,
    aboutusItem,
    faq,
    all,
    sources,
    privacyPolicy,
    termAndCondition,
  } = req.query;

  // let a = `[\"contactus\",\"home\"]`;
  // let arr = JSON.parse(a);
  if (all == "true") {
    const d = await CMS.find({});
    const pagesDynamicArray = [
      "home",
      "services",
      "order",
      "about_us",
      "contact_us",
    ];
    let newArray = [];
    d.map((item, i) => {
      pagesDynamicArray.map((pg) => {
        if (item[pg]) {
          item[pg]._id = item?._id;
          newArray.push(item[pg]);
        }
      });
    });

    res.status(200).json({
      status: "success",
      results: newArray.length,
      data: newArray,
    });
  } else {
    return res.status(200).json({
      status: "success",
      data: [],
    });
  }
});

exports.getPage = catchAsync(async (req, res, next) => {
  let { page } = req.params;
  let doc = await CMS.findOne({ [page]: { $exists: true } });

  res.status(200).json({
    status: "success",
    data: doc[page],
  });
});

exports.updatePage = catchAsync(async (req, res, next) => {
  let { _id, pageName } = req.body;
  const { files } = req;

  if (!_id || !pageName) return next(new AppError("args are missing.", 400));

  let outter = {
    [pageName]: { ...req.body },
  };

  req.body[pageName] = outter[pageName];

  const doc = await CMS.findById(_id);

  if (files?.sec1Image) {
    if (doc?.home?.sec1Image) await deleteFile(doc.home.sec1Image);
    req.body[pageName].sec1Image = files.sec1Image[0].key;
  }

  if (files?.sec1CoverImage) {
    if (doc?.home?.sec1CoverImage) await deleteFile(doc.home.sec1CoverImage);
    req.body[pageName].sec1CoverImage = files.sec1CoverImage[0].key;
  }

  if (files?.sec2Image) req.body[pageName].sec2Image = files.sec2Image[0].key;

  if (files?.sec3Image) req.body[pageName].sec3Image = files.sec3Image[0].key;

  if (files?.cover_image_Craftman)
    req.body[pageName].cover_image_Craftman = files.cover_image_Craftman[0].key;

  if (files?.cover_image_Company)
    req.body[pageName].cover_image_Company = files.cover_image_Company[0].key;

  if (files?.cover_image)
    req.body[pageName].cover_image = files.cover_image[0].key;

  if (files?.sec4Video) req.body[pageName].sec4Video = files.sec4Video[0].key;

  if (files?.aboutSection1Video)
    req.body[pageName].aboutSection1Video = files.aboutSection1Video[0].key;

  if (files?.sec3Video1)
    req.body[pageName].sec3Video1 = files.sec3Video1[0].key;
  if (files?.sec3Video2)
    req.body[pageName].sec3Video2 = files.sec3Video2[0].key;

  if (files?.images_list) {
    images = [];
    files?.images_list.forEach((file) => {
      images.push(file.key);
    });
    req.body[pageName].images_list = images;
  }

  let result = await CMS.findByIdAndUpdate(_id, req.body, { new: true });

  console.log({ result });

  res.status(200).json({
    status: "success",
    data: result,
  });
});

exports.getAllPages = catchAsync(async (req, res, next) => {
  let doc = await CMS.find({});

  res.status(200).json({
    status: "success",
    data: doc,
  });
});

exports.getlatestMessage = catchAsync(async (req, res, next) => {
  let msg = await Chat.find({
    to: req.user_id,
  })
    .populate({
      path: "room",
      populate: {
        path: "projectId",
        model: "Project",
      },
    })
    .sort("-createdAt")
    .skip(0)
    .limit(5);

  res.status(200).json({
    status: "success",
    data: msg,
  });
});
