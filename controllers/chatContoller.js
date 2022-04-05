const Rooms = require("./../models/roomModel");
const Chat = require("./../models/chatModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const User = require("./../models/userModel");
const admin = require("firebase-admin");

exports.getAllChatRooms = async (req, res, next) => {
  const userId = req.query.userId;
  const projectId = req.query.projectId;
  const proposalId = req.query.proposalId;

  const chatRooms = await Rooms.find({
    $or: [{ user1: userId }, { user2: userId }],
    projectId,
    proposalId,
  })
    .populate("user1")
    .populate("user2")
    .populate("projectId")
    .populate("proposalId");
  // const chatRooms = await Rooms.find({ user1: userId,user2: userId, });

  console.log(chatRooms);
  res.status(200).json({
    status: "success",
    data: chatRooms,
  });
};

exports.sendNewMsg = catchAsync(async (req, res, next) => {
  const { to, from, message, room } = req.body;
  if (!to || !from) return next(new AppError("Params are missing", 400));
  let getRoom = await Rooms.findByIdAndUpdate(
    room,
    {
      lastMessage: message.text,
      lastChatted: Date.now(),
    },
    { new: true }
  );

  if (getRoom.user1 === to) {
    await Rooms.findByIdAndUpdate(
      room,
      { $inc: { user1UnreadCount: 1 } },
      { new: true }
    );
  }

  if (getRoom.user2 === to) {
    await Rooms.findByIdAndUpdate(
      room,
      { $inc: { user2UnreadCount: 1 } },
      { new: true }
    );
  }

  // if (checkRoomId == null) {
  //   checkRoomId = await Rooms.findByIdAndUpdate({ user1: from, user2: to });
  // }
  // if (checkRoomId == null) {
  //   checkRoomId = await Rooms.create({
  //     user1: from,
  //     user2: to,
  //     user2UnreadCount: 1,
  //     lastMessage: message.text,
  //     lastChatted: Date.now(),
  //   });
  // } else {
  //   await Rooms.findByIdAndUpdate(checkRoomId._id, {
  //     lastMessage: message.text,
  //   });
  // }

  let msg = await Chat.create(req.body);

  // let fromUser = await User.findById(from);
  // let toUserTokens = await User.findById(to).select("fcmToken");

  // let UserPhoto =
  //   fromUser.provider == null
  //     ? `https://arcane-river-30769.herokuapp.com/img/${from?.photo}`
  //     : fromUser.photo;

  console.log(message);

  // admin
  //   .messaging()
  //   .sendMulticast({
  //     notification: {
  //       title: fromUser.displayName,
  //       body: message.text,
  //       imageUrl: UserPhoto,
  //     },
  //     tokens: toUserTokens.fcmToken,
  //   })
  //   .then((response) => {
  //     console.log(JSON.stringify(response, null, 2));
  //   });

  res.status(200).json({
    status: "success",
    data: msg,
  });
});

exports.getAllMsg = catchAsync(async (req, res, next) => {
  const limit = req.query.limit * 1 || 30;
  const skip = req.query.skip * 1 || 0;
  const { roomId, projectId, userId } = req.query;
  let finalMessages = [];

  if (!projectId || !userId)
    return next(new AppError("Params are missing", 400));

  let Room = await Rooms.findOne({ projectId, user1: userId });

  const msg = await Chat.find({
    room: Room._id,
  })
    .select("message -_id")
    .sort("-createdAt")
    .skip(skip)
    .limit(limit);

  if (msg.length > 0) {
    msg.forEach((item) => {
      finalMessages.push(item.message);
    });
  }

  console.log(JSON.stringify(msg, null, 2));

  res.status(200).json({
    status: "success",
    data: finalMessages,
    room: Room
  });
});
