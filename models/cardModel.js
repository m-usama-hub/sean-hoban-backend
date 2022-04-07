const mongoose = require("mongoose");

const cardSchema = new mongoose.Schema(
  {
    icon: {
      type: String,
      default: null,
      require: [true, "Icon is required"],
    },
    type: {
      type: String,
      default: "Goal",
      enum: ["Goal", "Service", "Company"],
      require: [true, "type is required"],
    },
    title: {
      type: String,
      default: null,
      // require: [true, 'title is required'],
    },
    description: {
      type: String,
      default: null,
      // require: [true, 'description is required'],
    },
  },
  { timestamps: true }
);
const Card = mongoose.model("Card", cardSchema);

module.exports = Card;
