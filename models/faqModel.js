const mongoose = require("mongoose");

const FaqSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      default: null,
      required: [true, "question is required"],
    },
    answer: {
      type: String,
      default: null,
      required: [true, "answer is required"],
    },
  },
  { timestamps: true }
);
const Faq = mongoose.model("Faq", FaqSchema);

module.exports = Faq;
