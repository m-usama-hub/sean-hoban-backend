const multer = require("multer");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("../controllers/handlerFactory");
const AppError = require("../utils/appError");
const { filterObj } = require("../utils/fn");

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.verifyMe = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  console.log("I ran!!");
  await User.findOneAndUpdate({ _id: id }, { isVerified: true }).select(
    "isVerified"
  );

  await Project.findOneAndUpdate(
    { postedBy: id, isActive: false },
    { isActive: true }
  );

  res.render("emailVerified");
});

const violation_ban_func = async ({ id }) => {
  const doc = await User.findOne({ _id: id });
  if (doc.violationAttempts + 1 == 3) {
    await User.findByIdAndUpdate({ _id: id }, { deactivate: true });
  }
  await User.findByIdAndUpdate(
    { _id: id },
    { $inc: { violationAttempts: +1 } },
    { new: true }
  );
};

exports.log_violation_attempts_or_ban = catchAsync(async (req, res, next) => {
  violation_ban_func(req.body);

  res.status(200).json({
    status: "success",
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "contactNo", "isOnline");

  if (req.files.photo) filteredBody.photo = req.files.photo[0].key;

  // const { lat, lng } = filteredBody;

  // if (lat && lng)
  //   filteredBody.location = {
  //     type: "Point",
  //     coordinates: [lng, lat],
  //   };

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /signup instead",
  });
};

exports.updateSubscription = catchAsync(async (req, res, next) => {
  const { user, allowed } = req.body;

  if (!user) return next(new AppError("user is required.", 400));
  console.log({ user, allowed });
  let obj = {};

  if (allowed)
    obj = {
      plan: "price_1K4AvOCVf0eQsmpsbyy4P4Ps",
      subscriptionType: "none",
      isSubscriptionOn: true,
      subscription: "sub_1KJMTeCVf0eQsmpsPIvj58Gt",
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      subscriptionAssignedByadmin: true,
    };
  else
    obj = {
      subscriptionAssignedByadmin: false,
      plan: null,
      subscriptionType: "none",
      isSubscriptionOn: false,
      subscription: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
    };

  const data = await User.findByIdAndUpdate(user, obj);

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getProjectDetails = catchAsync(async (req, res, next) => {
  console.log(req.query.projectId);
  let data = await Project.findById(req.query.projectId)
    .populate({
      path: "porposalsForCustomer",
      populate: {
        path: "sendTo",
        model: "User",
      },
    })
    .populate({
      path: "accecptedPorposalByCustomer",
      populate: {
        path: "sendTo",
        model: "User",
      },
    })
    .populate({
      path: "porposalsForFreelancer",
      populate: {
        path: "sendTo",
        model: "User",
      },
    })
    .populate({
      path: "accecptedPorposalByFreelancer",
      populate: {
        path: "sendTo",
        model: "User",
      },
    })
    .populate("postedBy")
    .populate("assignTo");

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
