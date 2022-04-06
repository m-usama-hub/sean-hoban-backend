const S3 = require("aws-sdk/clients/s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const AppError = require("./appError");
const path = require("path");
const fs = require("fs");

const imageBucket = process.env.AWS_PDF_BUCKET_NAME;
const fileBucket = process.env.AWS_FILE_BUCKET_NAME;
const pdfBucket = process.env.AWS_PDF_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

const multerPdfFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image") ||
    file.mimetype.startsWith("application/pdf")
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError("Not an image! Please upload only images/pdf.", 400),
      false
    );
  }
};
// console.log({ pdfBucket });

const uploadPDfs = multer({
  storage: multerS3({
    s3: s3,
    bucket: pdfBucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${uuidv4()}.pdf`);
    },
  }),
  limits: { fileSize: 20000000 }, // In bytes: 3000000 bytes = 3 MB // 20000000 bytes = 20 MB
  fileFilter: multerPdfFilter,
});

exports.uploadUserPDfs = uploadPDfs.fields([
  {
    name: "resources",
    maxCount: 1,
  },
  {
    name: "pdfs",
    maxCount: 10,
  },
  // {
  //   name: 'privateDocuments',
  //   maxCount: 2,
  // },
]);

const uploadImage = multer({
  storage: multerS3({
    s3: s3,
    bucket: imageBucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${uuidv4()}.jpg`);
    },
  }),
  limits: { fileSize: 3000000 }, // In bytes: 2000000 bytes = 3 MB
  fileFilter: multerPdfFilter,
});

exports.uploadUserImage = uploadImage.fields([
  {
    name: "photo",
    maxCount: 1,
  },
  {
    name: "cover_image",
    maxCount: 1,
  },
  {
    name: "image",
    maxCount: 1,
  },
  {
    name: "icon",
    maxCount: 1,
  },
  {
    name: "cms",
    maxCount: 10,
  },
  {
    name: "cover_image",
    maxCount: 1,
  },
  {
    name: "display_image",
    maxCount: 1,
  },
  {
    name: "sec1Image",
    maxCount: 1,
  },
  {
    name: "sec2Image",
    maxCount: 1,
  },
  {
    name: "sec3Image",
    maxCount: 1,
  },
  {
    name: "privateDocumentsThumbnail",
    maxCount: 2,
  },
  {
    name: "documentsThumbnail",
    maxCount: 4,
  },
  {
    name: "sec1CoverImage",
    maxCount: 1,
  },
  {
    name: "sec3CoverImage",
    maxCount: 1,
  },
  {
    name: "icon",
    maxCount: 1,
  },
  {
    name: "projectImages",
    maxCount: 10,
  },
]);

const uploadFiles = multer({
  storage: multerS3({
    s3: s3,
    bucket: fileBucket,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${uuidv4() + path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 20000000 }, // In bytes: 3000000 bytes = 3 MB // 20000000 bytes = 20 MB
  fileFilter: multerPdfFilter,
});

exports.uploadUserFiles = uploadFiles.fields([
  {
    name: "pdfs",
    maxCount: 10,
  },
  {
    name: "projectImages",
    maxCount: 10,
  },
  {
    name: "docs",
    maxCount: 20,
  },
]);

exports.uploadServerFile = (filePath) => {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: fileBucket,
    Key: path.basename(filePath),
    Body: fileContent,
  };

  return s3.upload(params).promise();
};

exports.getFileStream = (fileKey) => {
  const downloadParams = {
    Key: fileKey,
    Bucket: fileBucket,
  };

  return s3.getObject(downloadParams).createReadStream();
};

exports.deleteFile = (fileKey) => {
  const deleteParams = {
    Key: fileKey,
    Bucket: fileBucket,
  };

  return s3.deleteObject(deleteParams).promise();
};
