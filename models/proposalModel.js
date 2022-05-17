const mongoose = require("mongoose");

const ProjectMilestonesSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
    },
    description: {
      type: String,
      required: [true, "description is required"],
    },
    amount: {
      type: Number,
      required: [true, "amount is required"],
    },
    isMilestonePaid: {
      type: Boolean,
      default: false,
    },
    makeWidthDrawlRequest: {
      type: Boolean,
      default: false,
    },
    makeReleaseRequest: {
      type: Boolean,
      default: false,
    },
    widthDrawlRequestedAt: {
      type: Date,
    },
    widthDrawlDetail: {
      type: String,
    },
    releaseRequestedAt: {
      type: Date,
    },
    invoice: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "inProgress", "completed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const ProposalSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    title: {
      type: String,
      required: [true, "title is required"],
    },
    description: {
      type: String,
      required: [true, "description is required"],
    },
    docs: {
      type: [String],
      default: [],
    },
    amount: {
      type: Number,
      required: [true, "amount is required"],
    },
    status: {
      type: String,
      enum: ["active", "rejected", "accepted"],
      required: [true, "status is required"],
    },
    sendTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "reciver userId is required"],
    },
    invoice: {
      type: String,
    },
    milestones: [ProjectMilestonesSchema],
  },
  {
    timestamps: true,
  }
);

const Proposal = mongoose.model("Proposal", ProposalSchema);

module.exports = Proposal;
