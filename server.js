const mongoose = require("mongoose");
const dotenv = require("dotenv");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  console.log(err.name, err.message);
  // process.exit(1);
});

dotenv.config({ path: "./config.env" });
const { app, http } = require("./app");
let DB;

console.log(
  "============================================",
  process.env.NODE_ENV,
  "============================================"
);

var connectTo = "";

if (process.env.NODE_ENV == "development") {
  DB = process.env.DEV_DATABASE.replace(
    "<PASSWORD>",
    process.env.DEV_DATABASE_PASSWORD
  );

  connectTo = "Development Database";
} else {
  DB = process.env.DATABASE.replace(
    "<PASSWORD>",
    process.env.DATABASE_PASSWORD
  );
  connectTo = "Live Database";
}
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() =>
    console.log("DB connection successful connected to " + connectTo)
  );

const port = process.env.PORT || 3000;
const server = http.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// process.on('unhandledRejection', (err) => {
//   console.log('UNHANDLED REJECTION! 💥 Shutting down...');
//   console.log(err.name, err.message);
//   server.close(() => {
//     process.exit(1);
//   });
// });

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
