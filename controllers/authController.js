const crypto = require("crypto");
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Project = require("../models/projectModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Email = require("../utils/email");
const { customer: StripeCustomer } = require("../utils/stripe");
const { handler } = require("../utils/fn");
const generator = require("generate-password");
const AuthService = require("../services/AuthService");
const StripeService = require("../services/StripeService");
const notification = require("../services/NotificationService");
const EmailService = require("../services/EmailSendingService");
const ProjectService = require("../services/ProjectService");
const { CourierClient } = require("@trycourier/courier");

exports.signup = catchAsync(async (req, res, next) => {
  let { email, role, deviceId, name, password, passwordConfirm, contactNo } =
    req.body;

  await AuthService.CheckUserExist(email, next);

  // creating Stripe customer
  const cus = await StripeCustomer(email);

  let Userdata = {
    role,
    deviceId,
    cus: cus.id,
    name,
    email,
    password,
    contactNo,
    passwordConfirm,
  };

  if (role == "freelancer") {
    Userdata.status = "pending";
    Userdata.active = false;
    Userdata.deactivate = true;
  }

  const newUser = await User.create(Userdata);

  // const url = `${req.protocol}://${req.get('host')}/me`;
  const url = `${req.protocol}://${req.get("host")}/api/v1/users/verify-me/${
    newUser.id
  }`;

  await notification.dispatchToAdmin(
    {
      type: "user",
      message: name + " Registered as " + role,
      title: "New registration",
      typeId: newUser._id,
    },
    req
  );

  await new EmailService(
    newUser,
    {
      username: name,
      url: url,
      appname: process.env.APP_NAME,
    },
    "verify"
  ).Send();

  // await new Email(newUser, url)
  //   .sendEmailVerificationEmail()
  //   .catch((e) => console.log(e));

  AuthService.createSendToken(newUser, 201, req, res);
});

exports.signupWithProject = catchAsync(async (req, res, next) => {
  let {
    email,
    role,
    deviceId,
    name,
    password,
    passwordConfirm,
    contactNo,
    title,
    description,
    amount,
  } = req.body;

  let postProject = {
    title,
    description,
    amount,
    isActive: false,
  };
  let { files } = req;

  await AuthService.CheckUserExist(email, next);

  // creating Stripe customer
  const cus = await StripeCustomer(email);

  let newUser = await User.create({
    role,
    deviceId,
    cus: cus.id,
    name,
    email,
    password,
    contactNo,
    passwordConfirm,
  });

  // const url = `${req.protocol}://${req.get('host')}/me`;
  const url = `${req.protocol}://${req.get("host")}/api/v1/users/verify-me/${
    newUser.id
  }`;

  await notification.dispatchToAdmin(
    {
      type: "user",
      message: name + " Registered as " + role,
      title: "New registration",
      typeId: newUser._id,
    },
    req
  );

  await new EmailService(
    newUser,
    {
      username: name,
      url: url,
      appname: process.env.APP_NAME,
    },
    "verify"
  ).Send();

  postProject.postedBy = newUser._id;

  if (files?.pdfs) {
    postProject.pdfs = await ProjectService.uploadPdfs(files?.pdfs);
  }

  if (files?.projectImages) {
    postProject.images = await ProjectService.uploadImages(
      files?.projectImages
    );
  }

  const newproject = await Project.create(postProject);

  newUser.createdProject = newproject;

  AuthService.createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide email and password!", 400));
  }

  let user = await User.findOne({ email }).select("+password +isVerified");

  // 2) Check if user exists && password is correct
  await AuthService.CheckUserAndAccess(user, next);

  AuthService.UserIsVerfied(user, next);

  AuthService.RedirectBlockUser(user, next);

  AuthService.RedirectPendingUser(user, next);

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client

  user = await User.findByIdAndUpdate(
    user._id,
    { passwordChangedAt: Date.now() - 1000 },
    { new: true }
  );

  AuthService.createSendToken(user, 200, req, res);
});

// Admin login
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password, role } = req.body;

  // if (role !== 'admin' || role === undefined)
  //   return next(new AppError('you are not admin.', 401));

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select({
    password: 1,
    adminName: 1,
    role: 1,
    photo: 1,
    isVerified: 1,
    firstName: 1,
    lastName: 1,
  });

  AuthService.CheckAdminUserAndAccess(user, next);

  AuthService.UserIsVerfied(user, next);

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  // 3) If everything ok, send token to client
  AuthService.createSendToken(user, 200, req, res);
});

exports.logout = catchAsync(async (req, res) => {
  const { token } = req.body;

  await User.findByIdAndUpdate(req.user._id, {
    lastLogin: Date.now(),
    $pull: { fcmToken: token },
    // $push: { loginHistory: logoutObject },
  });

  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
});

// Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  console.log(req.body);

  let { email } = req.body;

  if (!email) return next(new AppError("Please Provide your email", 401));

  // 1) Get user based on POSTed email
  const user = await User.findOne({ email });

  AuthService.CheckUserAndAccess(user, next, false);

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/users/resetPassword/${resetToken}?token=${
      req.protocol
    }://${req.get("host")}/api/v1/users/resetPasswordDone/${resetToken}`;

    // await new Email(user, resetURL).sendPasswordReset();

    await new EmailService(
      user,
      {
        username: user.name,
        url: resetURL,
      },
      "passwordReset"
    ).Send();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log({ err });
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

exports.resetPassword = catchAsync(async (req, res) => {
  const { token } = req.query;
  const { token1 } = req.params;
  console.log({ token, token1 });
  res.render("password-page", { token });
  // res.render('thankyou', { token });
});

exports.resetPasswordDone = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  await notification.dispatchToAdmin(
    {
      type: "user",
      message: user.name + " reset his passowrd.",
      title: "Password Reset",
      typeId: user._id,
    },
    req
  );

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  await new Email(user, (resetURL = "")).sendPasswordResetComfirmation();
  // await sendPasswordResetComfirmation(neUser);

  res.render("thankyou");
});
/* 
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user.id).select("+password");

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  AuthService.createSendToken(user, 200, req, res);
});
