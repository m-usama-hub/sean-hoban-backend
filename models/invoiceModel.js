const mongoose = require("mongoose");
const toJson = require("@meanie/mongoose-to-json");

const invoiceSchema = new mongoose.Schema(
  {
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
    milestone: {
      type: Object,
    },
    to: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    from: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    path: {
      type: Object,
      required: true,
    },
    status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
