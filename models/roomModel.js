const mongoose = require("mongoose");
const toJson = require("@meanie/mongoose-to-json");

const RoomSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.ObjectId,
      ref: "Project",
      required: true,
    },
    proposalId: {
      type: mongoose.Schema.ObjectId,
      ref: "Proposal",
      required: true,
    },
    user1UnreadCount: {
      type: Number,
      default: 0,
    },
    user2UnreadCount: {
      type: Number,
      default: 0,
    },
    lastMessage: {
      type: String,
      default: null,
    },
    lastChatted: {
      type: Date,
      default: Date.now(),
    },
  },
  { timestamps: true }
);

RoomSchema.plugin(toJson);
const Rooms = mongoose.model("Room", RoomSchema);

module.exports = Rooms;
