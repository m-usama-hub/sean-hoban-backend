const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppError = require("../utils/appError");

signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

exports.CheckUserExist = async (email, next) => {
  const userExists = await User.findOne({ email });

  if (userExists) {
    return next(new AppError("User already Exist.", 401));
  }
};

exports.CheckUserAndAccess = async (user, next, checkRole = true) => {
  if (!user) {
    return next(new AppError("No user is specified with this email.", 401));
  }

  if (checkRole && ["admin", "super-admin"].includes(user.role)) {
    return next(new AppError("Not a admin Login.", 403));
  }
};

exports.CheckAdminUserAndAccess = async (user, next) => {
  if (!user) {
    return next(new AppError("No user is specified with this email.", 401));
  }

  if (!["admin", "super-admin"].includes(user.role)) {
    return next(new AppError("Not a User Login.", 403));
  }
};

exports.RedirectBlockUser = (user, next) => {
  return user.deactivate
    ? next(
        new AppError(
          "You are either blocked or banned, Kindly contact support",
          401
        )
      )
    : user;
};

exports.RedirectPendingUser = (user, next) => {
  return user.status == "pending"
    ? next(
        new AppError("Admin will Verify your account within 24 -72 hours", 401)
      )
    : user;
};

exports.UserIsVerfied = (user, next) => {
  if (!user.isVerified) {
    return next(new AppError("Please Verify your email first", 401));
  }
};
