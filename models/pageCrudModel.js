const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    secName: {
      type: String,
      enum: [
        "company",
        "onboarding-process",
        "our-services",
        "how-to-order",
        "testimonials",
        "our-latest-news",
        "social-icons",
        "greatest-asset-time",
        "quantities-for",
        "our-experts",
      ],
    },
    title: String,
    subTitle: String,
    description: String,
    rating: String,
    image: String,
    coverImage: String,
    socialUrl: String,
    linkedIn: String,
    twitter: String,
    googlePlus: String,
    sharableLink: String,
  },
  { timestamps: true }
);
const Pages = mongoose.model("Pages", pageSchema);

module.exports = Pages;
