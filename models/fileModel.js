const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    s3key: {
      type: String,
    },
    file: {
      type: Object,
    },
    mimetype: {
      type: String,
    },
  },
  { timestamps: true }
);
const FileData = mongoose.model("FileData", fileSchema);

module.exports = FileData;
