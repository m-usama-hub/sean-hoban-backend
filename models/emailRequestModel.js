const mongoose = require("mongoose");
const toJson = require("@meanie/mongoose-to-json");

const emailRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
    },
    data: {
      type: Object,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmailRequest = mongoose.model("EmailRequest", emailRequestSchema);

module.exports = EmailRequest;
