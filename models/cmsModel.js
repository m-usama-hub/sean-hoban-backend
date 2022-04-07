const mongoose = require("mongoose");

const cmsSchema = new mongoose.Schema(
  {
    home: {
      type: {
        pageName: { type: String, default: "home" },

        //looking for mew challange
        heading_Craftman: String,
        detail_description_Craftman: String,
        cover_image_Craftman: String,

        //right candidates
        heading_Company: String,
        detail_description_Company: String,
        cover_image_Company: String,

        //find the dream job
        sec1Heading: String,
        sec1Image: String,
        sec1Description: String,

        //for companies
        sec2Heading: String,
        sec2Description: String,

        //for dc steel
        sec3Heading: String,
        sec3Image: String,
        sec3Description: String,

        sec4Video: String,

        //extra
        cover_image: String,
        display_image: String,
      },
    },
    company: {
      type: {
        pageName: { type: String, default: "company" },

        //temporary or permenent employee
        heading: String,
        detail_description: String,
        cover_image: String,

        //three diff options
        heading1: String,
        textDesc: String,

        //our services
        sec1Heading: String,
        sec1Images: [String],

        //find new employees
        sec2Heading: String,
        sec2coverImage: String,

        //what people say
        sec3Heading: String,
        sec3Video1: String,
        sec3Name1: String,
        sec3Company1: String,
        sec3Video2: String,
        sec3Name2: String,
        sec3Company2: String,
      },
    },
    craftman: {
      type: {
        pageName: { type: String, default: "craftsman" },

        //new challenges
        heading: String,
        detail_description: String,
        cover_image: String,

        //skilled and qualified labor
        sec1Heading: String,
        sec1Text: String,
        sec1Images: [String],

        //dream job
        sec2Heading: String,
        sec2coverImage: String,

        //latest jobs
        heading1: String,

        //what people says
        sec3Heading: String,
        sec3Video1: String,
        sec3Name1: String,
        sec3Company1: String,
        sec3Video2: String,
        sec3Name2: String,
        sec3Company2: String,
      },
    },
    all_jobs: {
      type: {
        pageName: { type: String, default: "all_jobs" },
        heading: String,
        cover_image: String,
      },
    },
    about_us: {
      type: {
        // About us
        pageName: { type: String, default: "about_us" },
        heading: String,
        cover_image: String,

        // about jobster
        sec1Heading: String,
        sec1Video: String,
        sec1Description: String,

        //why choose us
        sec2Heading: String,
        sec2Text: String,
        sec2coverImage: String,

        //companies worked with us
        sec3Heading: String,
        sec3Images: [String],
      },
    },
    contact_us: {
      type: {
        pageName: { type: String, default: "contact_us" },

        //contact us
        heading: String,
        cover_image: String,
      },
    },
  },
  { timestamps: true }
);
const CMS = mongoose.model("CMS", cmsSchema);

module.exports = CMS;
