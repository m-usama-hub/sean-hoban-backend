const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "title is required"],
    },
    description: {
      type: String,
      required: [true, "description is required"],
    },
    pdfs: {
      type: [String],
    },
    images: {
      type: [String],
    },
    amount: {
      type: Number,
      required: [true, "amount is required"],
    },
    currency: {
      type: String,
      enum: ["gbp", "eur"],
      required: [true, "currency is required"],
      default: "eur",
    },
    timeline: {
      type: String,
    },
    amountPayedToAdmin: {
      type: Number,
      default: 0,
    },
    amountPayedToFreelancer: {
      type: Number,
      default: 0,
    },
    projectStatus: {
      type: String,
      enum: ["pending", "underReview", "inProgress", "onHold", "completed"],
      default: "pending",
    },
    reviewdByAdmin: {
      type: Boolean,
      default: false,
    },
    porposalsForCustomer: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Proposal",
    },
    accecptedPorposalByCustomer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
    },
    privacyPolicyForCustomer: {
      type: String,
    },
    porposalsForFreelancer: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Proposal",
    },
    accecptedPorposalByFreelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isAssigned: {
      type: Boolean,
      default: false,
    },
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isActive: {
      // This status is used for signup-with-project api
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
