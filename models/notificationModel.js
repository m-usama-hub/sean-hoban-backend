const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // notificationStatus for showing the icon in UI
    notificationType: {
      type: String,
      enum: [
        "payment",
        "project",
        "invoice",
        "proposal",
        "message",
        "promotional",
        "user",
        "milestone",
      ],
      required: [true, "Notification type is required."],
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    message: {
      type: String,
      required: [true, "message is required."],
    },
    title: {
      type: String,
      required: [true, "title is required."],
    },
    link: String,
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    isReaded: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
