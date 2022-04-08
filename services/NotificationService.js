const notification = require("../models/notificationModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");

exports.dispatch = async (payload, req) => {
  await notification.create({
    sender: req.user?._id,
    notificationType: payload.type,
    receiver: payload.receiver,
    message: payload.message,
    title: payload.title,
    link: payload.typeId,
    projectId: payload.projectId,
  });
};

exports.dispatchMany = async (payload, req) => {
  let postNotifications = [];

  payload.forEach(function (data) {
    postNotifications.push({
      sender: req.user?._id,
      notificationType: data.type,
      receiver: data.receiver,
      message: data.message,
      title: data.title,
      link: data.typeId,
      projectId: data.projectId,
    });
  });

  await notification.insertMany(postNotifications);
};

exports.dispatchToAdmin = async (payload, req) => {
  let admins = await User.find({ role: "admin" });

  let not = [];

  admins.forEach(function (admin) {
    not.push({
      sender: req.user?._id,
      notificationType: payload.type,
      receiver: admin._id,
      message: payload.message,
      title: payload.title,
      link: payload.typeId,
      projectId: payload.projectId,
    });
  });

  await notification.insertMany(not);
};
