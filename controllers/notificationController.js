const admin = require("firebase-admin");
const Notification = require("../models/notificationModel");
const catchAsync = require("../utils/catchAsync");
const factory = require("./handlerFactory");
// const AppError = require('./../utils/appError');

// var serviceAccount = require("../richard-lms-f88a6-firebase-adminsdk-hjkr6-0f947291d5.json");
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

exports.seenNotifiation = catchAsync(async (req, res, next) => {
  //   code here
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;

  let { notificationId } = req.query;

  let notfs;

  await Notification.findByIdAndUpdate(
    notificationId,
    { isReaded: true },
    { new: true }
  );

  notfs = await Notification.find({
    receiver: req.user._id,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: "success",
    results: notfs.length,
    data: notfs,
  });
});

exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const page = req.query.page * 1 || 1;
  const limit = req.query.limit * 1 || 15;
  const skip = (page - 1) * limit;

  let notfs = null;
  let newNotifications = null;

  // checking for new notifications
  newNotifications = await Notification.countDocuments({
    receiver: req.user._id,
    isReaded: false,
  });

  // getting paginated notifications for mentor
  notfs = await Notification.find({
    receiver: req.user._id,
  })
    .populate("projectId")
    .populate("sender")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    status: "success",
    results: notfs.length,
    newNotifications,
    data: notfs,
  });
});

/*

sender : user,
senderMode : ['admin', 'mentee', 'mentor']
for : ['admin', 'all', 'mentee', 'mentor']
notificationStatus : ['admin', 'all', 'mentee', 'mentor', 'new booking', 'dispute', 'actin required', 'announcement']
message : String
===> if its private notificaion
receiver : 
read_by : User ---> to psuh used for update

*/
// const imageUrl = `${process.env.BACKEND_URL}/img/logo.png`;

// admin
//   .messaging()
//   .sendMulticast({
//     notification: {
//       title: 'Mentgo! Your modern mentor',
//       body: 'obj.messag',
//       imageUrl,
//       // 'https://i.pinimg.com/736x/f0/42/ad/f042ada5fe30d167bc6a9b0c0fc0a60e.jpg',
//     },
//     tokens: [
//       'fxnFNQR7Kpta7Uy9NGaXwl:APA91bHH6tInTtHsPoCwrvfUoxboVF8UJJh7zdQyjNDCmS9_OJm2YZa7e23XaXxUzn7dXRqqiX_kC1a_Fq0DuYy1YBcWMI82U-udACMBFsZygDWGrvGRV_gMY9-ei2-cRmK4r7JIkQ_K',
//     ],
//   })
//   .then((response) => console.log('notification sent!'));

exports.createNotification = async (req, obj) => {
  let imageUrl = "";

  // console.log({ O: obj?.fc });
  if (obj?.fcmToken?.length > 0) {
    if (req) imageUrl = `${req.protocol}://${req.get("host")}/img/logo.png`;
    else imageUrl = `${process.env.BACKEND_URL}/img/logo.png`;

    // admin
    //   .messaging()
    //   .sendMulticast({
    //     notification: {
    //       title: "Mentgo! Your modern mentor",
    //       body: obj.message,
    //       imageUrl,
    //       // 'https://i.pinimg.com/736x/f0/42/ad/f042ada5fe30d167bc6a9b0c0fc0a60e.jpg',
    //     },
    //     tokens: obj.fcmToken,
    //   })
    //   .then((response) => console.log("notification sent!"));
  }
  // .send(
  //   fmcMsgStructure(
  //     'Mentgo! Your modern mentor',
  //     obj.message,
  //     obj.fcmToken
  //     // 'fxnFNQR7Kpta7Uy9NGaXwl:APA91bHH6tInTtHsPoCwrvfUoxboVF8UJJh7zdQyjNDCmS9_OJm2YZa7e23XaXxUzn7dXRqqiX_kC1a_Fq0DuYy1YBcWMI82U-udACMBFsZygDWGrvGRV_gMY9-ei2-cRmK4r7JIkQ_K'
  //   )
  // )
  // .then((e) => console.log('notification sent!'))
  // .catch((err) => {
  //   console.log(err);
  // });

  if (req != null) req.body.read_by = req.user._id;
  const testtt = await Notification.create(obj);
};

exports.createManyNotification = async (req, ArrayObjs) => {
  // req.body.read_by = req?.user?._id;
  await Notification.insertMany(ArrayObjs);
};

exports.deleteNotification = factory.deleteOne(Notification);
exports.updateNotification = factory.updateOne(Notification);

// notification obj
// const obj = {
//   sender: req.user._id,
//   senderMode: 'mentee',
//   for: 'mentor',
//   notificationStatus: 'new booking',
// title: 'Booking',
//   message: 'You have a new session request.',
//   receiver: isInstant.UserId,
//   read_by: req.user._id,
//    fcmToken: ['fxnFNQR7Kpta7Uy9NGaXwl:APA91bHH6tInTtHsPoCwrvfUoxboVF8UJJh7zdQyjNDCmS9_OJm2YZa7e23XaXxUzn7dXRqqiX_kC1a_Fq0DuYy1YBcWMI82U-udACMBFsZygDWGrvGRV_gMY9-ei2-cRmK4r7JIkQ_K'],
// };
// await createNotification(req, obj);
