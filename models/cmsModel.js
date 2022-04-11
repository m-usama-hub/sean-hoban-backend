const mongoose = require("mongoose");

const cmsSchema = new mongoose.Schema(
  {
    home: {
      type: {
        pageName: { type: String, default: "home" },

        // Section 1: Delivered to The Highest Standards
        sec1Heading: String,
        sec1Description: String,
        sec1Image: String,
        sec1CoverImage: String,

        // Section 2: Our Onboarding Process
        sec2Heading: String,
        sec2Description: String,

        // Section 3: Our Services
        sec3Heading: String,
        sec3Description: String,

        // Section 4: Video (Chilled Serenity)
        sec4Video: String,

        // Section 5: How To Order
        sec5Heading: String,

        // Section 6: Testimonial
        sec6Heading: String,

        // Section 7: Our Latest News
        sec7Heading: String,

        // Section 8: Contact Us
        sec8Heading: String,
        sec8Description: String,
      },
    },
    services: {
      type: {
        pageName: { type: String, default: "services" },

        // Section 1: Our Services
        sec1Heading: String,
        sec1CoverImage: String,

        // Section 3: Greatest Asset Time
        sec3Heading: String,
        sec3Description: String,

        // Section 4: Quantities For
        sec4Heading: String,
      },
    },
    order: {
      type: {
        pageName: { type: String, default: "order" },

        // Section 1: How To Order
        sec1Heading: String,
        sec1coverImage: String,

        // Section 3: Greatest Asset Time
        sec3Heading: String,
        sec3Description: String,
        sec3Image: String,
      },
    },
    about_us: {
      type: {
        // About us
        pageName: { type: String, default: "about_us" },

        // Section 1: About Us
        sec1Heading: String,
        sec1coverImage: String,

        // Section 2: Highest Standards
        sec2Description1: String,
        sec2Heading: String,
        sec2Description2: String,
        sec2coverImage: String,

        // Section 3: How It Works
        sec3Heading: String,
        sec3Description: String,
        sec3Video: String,

        // Section 4: Meet Our Experts
        sec4Heading: String,
        sec4Description: String,
      },
    },
    contact_us: {
      type: {
        pageName: { type: String, default: "contact_us" },

        // Section 1: Contact Us
        sec1Heading: String,
        sec1CoverImage: String,

        // Section 2: Get In Touch
        sec2Heading: String,
        sec2Description: String,
      },
    },
    footer: {
      type: {
        pageName: { type: String, default: "footer" },
        // Section 9: Footer
        description: String,
        email: String,
        number1: String,
        number2: String,
      },
    },
  },
  { timestamps: true }
);
const CMS = mongoose.model("CMS", cmsSchema);

module.exports = CMS;
