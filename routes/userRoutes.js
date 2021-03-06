const express = require("express");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const projectController = require("../controllers/projectController");
const RouteService = require("../services/RouteService");
const StripeService = require("../services/StripeService");
const catchAsync = require("../utils/catchAsync");
const {
  getPaymentMethods,
  AttachedPaymentMethod,
  deattachPaymentMethod,
  productList,
  cancelSubscription,
  createSubscription,
} = require("../utils/stripe");
const {
  uploadUserImage,
  uploadUserPDfs,
  uploadUserFiles,
} = require("../utils/s3");

/* const resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `img-${Math.random()}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/${req.file.filename}`);

  next();
}); */

const router = express.Router();
router.route("/product/all").get(productList);

router.post("/signup", authController.signup);
router.post(
  "/signup-with-project",
  uploadUserFiles,
  authController.signupWithProject
);
router.post("/forgotPassword", authController.forgotPassword);
router.post("/login", authController.login);
router.post("/admin-login", authController.adminLogin);
router.get("/resetPassword/:token", authController.resetPassword);
router.post("/resetPasswordDone/:token", authController.resetPasswordDone);

router.get("/verify-me/:id", userController.verifyMe);
router.post(
  "/log_violation_attempts_or_ban",
  userController.log_violation_attempts_or_ban
);

// Protect all routes after this middleware
router.use(RouteService.protect);
router.post("/logout", authController.logout);

router.patch("/updateMyPassword", authController.updatePassword);
// router.get('/me', userController.getMe, userController.getUser);
router.patch(
  "/updateMe",
  uploadUserImage,
  // uploadUserPhoto,
  // resizeUserPhoto,
  userController.updateMe
);
router.delete("/deleteMe", userController.deleteMe);

router.route("/payment-methods").get(getPaymentMethods);

router
  .route("/create-payment-method")
  .post(RouteService.restrictTo("customer"), StripeService.createPaymentMethod);

router
  .route("/attach-payment-methods")
  .post(RouteService.restrictTo("customer"), AttachedPaymentMethod);

router
  .route("/detach-payment-methods")
  .post(RouteService.restrictTo("customer"), deattachPaymentMethod);

router.route("/projectDetails").get(userController.getProjectDetails);

// router.route('/product/all').get(productList);

// router
//   .route("/create-subscription")
//   .post(RouteService.restrictTo("user"), createSubscription);

// router
//   .route("/cancel-subscription")
//   .get(RouteService.restrictTo("user"), cancelSubscription);

// router
//   .route('/video/watch')
//   .post(RouteService.restrictTo('user'), userController.watchTime);

router.use(RouteService.restrictTo("admin"));

router
  .route("/")
  // .get(userController.getAllUsers)
  .post(userController.createUser);
// router.route("/update-subscriptions").patch(userController.updateSubscription);

router
  .route("/:id")
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
