const path = require("path");
const express = require("express");
const morgan = require("morgan");
const moment = require("moment");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const schedule = require("node-schedule");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
// const hpp = require('hpp');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const compression = require("compression");
const cors = require("cors");
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");
const userRouter = require("./routes/userRoutes");
const adminRouter = require("./routes/adminRoutes");
const customerRouter = require("./routes/customerRoutes");
const freelancerRouter = require("./routes/freelancerRoutes");
const chatRouter = require("./routes/chatRoutes");
const cmsRouter = require("./routes/cmsRoutes");
const pageCrudRouter = require("./routes/pageCrudRoutes");
const notificationsRouter = require("./routes/notificationRoutes");
const PdfGeneratingService = require("./services/PdfGeneratingService");
const {
  getFileStream,
  getPDFFileStream,
  uploadbase64File,
} = require("./utils/s3");

const User = require("./models/userModel");
const Chat = require("./models/chatModel");
const Rooms = require("./models/roomModel");

const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

// const app = express();

app.enable("trust proxy");

app.use(express.static(path.join(__dirname, "public")));

// PUG CONFIG
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// EJS CONFIG
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/public", "/templates"));

app.use(cors());

app.options("*", cors());

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static("uploads"));

app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use(mongoSanitize());

app.use(compression());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Sean Hoban  APIs",
  });
});

// read images
app.get("/api/images/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const format = key.slice(-3);
    // if (key.indexOf)
    if (format == "mp4") res.set("Content-type", "video/mp4");
    else res.set("Content-type", "image/gif");

    await getFileStream(key)
      .on("error", (e) => {
        // return res.status(404).json({
        //   message: 'Image not Found.',
        // });
      })
      .pipe(res);
  } catch (e) {
    return res.status(404).json({
      message: "Image not found",
    });
  }
});

// fetching PDF from AWS
app.get(
  "/api/pdf/:key",
  // protect,
  // restrictTo('mechanic', 'super-admin', 'admin'),
  async (req, res, next) => {
    try {
      const key = req.params.key;

      // Content-type: application/pdf
      res.header("Content-type", "application/pdf");
      await getFileStream(key)
        .on("error", (e) => {
          // return res.status(404).json({
          //   message: 'Image not Found.',
          // });
        })
        .pipe(res);
    } catch (e) {
      return res.status(404).json({
        message: "Pdf not found",
      });
    }
  }
);

app.use("/api/v1/users", userRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/customer", customerRouter);
app.use("/api/v1/freelancer", freelancerRouter);
app.use("/api/v1/chat", chatRouter);
app.use("/api/v1/cms", cmsRouter);
app.use("/api/v1/page", pageCrudRouter);
app.use("/api/v1/notifications", notificationsRouter);

app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

io.on("connection", (socket) => {
  socket.on("join", async (id) => {
    const authId = id;
    const socketId = socket.id;
    const filter = { _id: authId };
    const update = { socketId: socketId, isOnline: true };
    try {
      const userData = await User.findOneAndUpdate(filter, update, {
        new: true,
      });
    } catch (e) {
      console.log("Task failed... 🧐🧐🧐", e);
    }
  });

  socket.on("chatJoin", async (id, roomId) => {
    const userId = id;

    try {
      messageReaded = await Chat.updateMany(
        { to: userId, room: roomId },
        { isReadMessage: 1, isDeliveredMessage: true }
      );
      const roomData = await Rooms.findById(roomId);

      let user = await User.findByIdAndUpdate(
        userId,
        { activeRoomId: roomId },
        { new: true }
      );

      console.log({ user });

      let query = {};
      if (userId == roomData?.user1) {
        query.user1UnreadCount = 0;
      } else {
        query.user2UnreadCount = 0;
      }
      const t = await Rooms.findByIdAndUpdate(roomId, query);
    } catch (e) {
      console.log("Task failed successfully... 🧐🧐🧐", e);
    }
  });

  socket.on(
    "image",
    // uploadUserPhoto,
    async (msg, msgTo, from, roomId, role, imgType) => {
      const receiverId = msgTo;
      let receiverUser;
      let base64Data;
      let lastMessage;

      console.log({ msg });

      // base64Data = msg.message.src.replace(/^data:image\/gif;base64,/, "");

      // if (imgType === "png") {
      //   base64Data = msg.message.src.replace(/^data:image\/png;base64,/, "");
      // } else if (imgType === "jpg" || imgType == "jpeg") {
      //   base64Data = msg.message.src.replace(/^data:image\/jpeg;base64,/, "");
      // } else if (imgType === "gif") {
      //   base64Data = msg.message.src.replace(/^data:image\/gif;base64,/, "");
      // } else if (imgType === "pdf") {
      //   base64Data = msg.message.src.replace(/^data:image\/pdf;base64,/, "");
      // }

      // const __rs = await uploadbase64File(base64Data);
      const __rs = await uploadbase64File(msg.message.src);

      const urr = `https://${socket.handshake.headers.host}/api/images/${__rs.key}`;

      msg.message.src = urr;
      msg.message.imgType = imgType;

      try {
        lastMessage = await Chat.findOne({ roomId }).sort("-createdAt");
        let sms = await Chat.create({
          message: msg.message,
          room: roomId,
          to: msgTo,
          from,
          isReadMessage: 0,
        });
        //mail

        receiverUser = User.findById(receiverId);

        io.emit("msg", sms, roomId);
      } catch (e) {
        console.log("msg submit error", e);
      }
    }
  );

  // mark-as-read
  socket.on("mark-as-read", async (roomId, role) => {
    console.log({ emit: "mark-as-read 📖📖📖" });
    if (role === "user") {
      await Rooms.findByIdAndUpdate(roomId, {
        user1UnreadCount: 0,
      });
    } else {
      await Rooms.findByIdAndUpdate(roomId, {
        user2UnreadCount: 0,
      });
    }
  });

  socket.on("leaveRoom", async (id) => {
    const userId = id;

    try {
      let user = await User.findByIdAndUpdate(
        userId,
        { activeRoomId: null },
        { new: true }
      );
      console.log({ user, userId });
    } catch (e) {
      console.log("Task failed successfully... 🧐🧐🧐", e);
    }
  });

  // on disconnect
  socket.on("disconnected", async (id) => {
    const authId = id;
    const filter = { _id: authId };
    const update = { isOnline: false };
    try {
      const userData = await User.findOneAndUpdate(filter, update, {
        new: true,
      });
    } catch (e) {
      console.log("error in disconnecting", e);
    }
  });

  // for messeging
  socket.on("msg", async (msg, msgTo, roomId) => {
    let receiverId = msgTo;

    try {
      console.log(
        "msg send soxket run =----------------------------------------------==="
      );
      const receiverUser = await User.findById(receiverId);
      const newMessage = new Chat({
        room: roomId,
        to: receiverUser._id,
        from: msg.user._id, // from UserId
        message: msg,
        isReadMessage: receiverUser.isOnline == null ? 0 : 1,
      });

      // update room => readCount
      const myRoom = await Rooms.findById(roomId);
      myRoom.user1 == msg.user._id
        ? await Rooms.findByIdAndUpdate(roomId, {
            // lastMessage: msg.text,
            lastMessage: msg.text,
            user1UnreadCount: 0,
            $inc: { user2UnreadCount: 1 },
          })
        : await Rooms.findByIdAndUpdate(roomId, {
            // lastMessage: msg.text,
            lastMessage: msg.text,
            user2UnreadCount: 0,
            $inc: { user1UnreadCount: 1 },
          });

      await newMessage.save();
      // ******************** FCM !Right *****************************
      console.log(receiverUser?.activeRoomId != roomId);
      if (
        receiverUser?.fcmToken.length > 0 &&
        receiverUser?.activeRoomId != roomId
      ) {
        admin
          .messaging()
          .sendMulticast({
            notification: {
              title: msg.user.name,
              body: msg?.text,
              imageUrl: msg.user.avatar,
            },
            // data: {
            //   roomId,
            //   name: msg.user.name,
            //   detailId: `${msg.user._id}`
            // },
            tokens: receiverUser.fcmToken,
          })
          .then((response) => {
            console.log({ response });
          })
          .catch((e) => {
            console.log({ e });
          });
      }

      io.emit("msg", msg, roomId);
      // await Rooms.findByIdAndUpdate(roomId, {
      //   lastMessage: msg
      // });
    } catch (e) {
      console.log(e, "msg submit error");
    }
  });
});

exports.app = app;
exports.http = http;
