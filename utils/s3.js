const S3 = require("aws-sdk/clients/s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const AppError = require("./appError");

const imageBucket = process.env.AWS_PDF_BUCKET_NAME;
const pdfBucket = process.env.AWS_PDF_BUCKET_NAME;
const videoBucket = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const s3 = new S3({
  region,
  accessKeyId,
  secretAccessKey,
});

exports.getDownloadingSignedURL = async (key) => {
  try {
    const url = await s3.getSignedUrlPromise("getObject", {
      Bucket: videoBucket,
      Key: key,
      // Expires: 30, // in seconds
      Expires: 15004, // in seconds
      ResponseContentType: "video/mp4",
    });
    return url;
  } catch (error) {
    return error;
  }
};

exports.getUploadingSignedURL = async (Key, Expires = 15004) => {
  try {
    console.log({
      UUID: `${uuidv4()}-video.mp4`,
      region,
      accessKeyId,
      secretAccessKey,
      videoBucket,
      Key,
    });
    const url = await s3.getSignedUrlPromise("putObject", {
      Bucket: videoBucket,
      Key: Key,
      // Expires: 60 * 2, // in seconds
      Expires, // in seconds {25 mints}
    });
    return url;
  } catch (error) {
    return error;
  }
};

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

/* 
// uploads a file to s3
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);

  const uploadParams = {
    Bucket: bucketName,
    Body: fileStream,
    Key: file.filename,
  };

  return s3.upload(uploadParams).promise();
}
exports.uploadFile = uploadFile;
 */
// downloads a file from s3

function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: imageBucket,
  };

  return s3.getObject(downloadParams).createReadStream();
}
exports.getFileStream = getFileStream;

exports.deleteImage = (fileKey) => {
  const deleteParams = {
    Key: fileKey,
    Bucket: imageBucket,
  };

  return s3.deleteObject(deleteParams).promise();
};

exports.deleteVideo = (fileKey) => {
  const deleteParams = {
    Key: fileKey,
    Bucket: videoBucket,
  };

  return s3.deleteObject(deleteParams).promise();
};

exports.deletePDF = (fileKey) => {
  const deleteParams = {
    Key: fileKey,
    Bucket: pdfBucket,
  };

  return s3.deleteObject(deleteParams).promise();
};

function getPDFFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: pdfBucket,
  };

  return s3.getObject(downloadParams).createReadStream();
}

function getvideoFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: videoBucket,
  };

  return s3.getObject(downloadParams).createReadStream();
}
exports.getvideoFileStream = getvideoFileStream;
exports.getPDFFileStream = getPDFFileStream;
