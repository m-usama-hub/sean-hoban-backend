const path = require("path");
const fs = require("fs");
const Card = require("../models/cardModel");
const CMS = require("../models/cmsModel");
const systemConfig = require("../models/systemConfigModel");
const Faq = require("../models/faqModel");
// const {} = require('../utils/s3');
const catchAsync = require("../utils/catchAsync");
const { constants } = require("short-uuid");
const { uploadUserFiles } = require("../utils/s3");

// System Service/Goal Curd

exports.getservices = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const service = await Card.findById(id);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data: service,
  });
});

exports.getAllservices = catchAsync(async (req, res, next) => {
  // const { type } = req.query;

  const service = await Card.find().sort("-createdAt");

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data: service,
  });
});

exports.pageData = catchAsync(async (req, res, next) => {
  const { name } = req.query;

  let doc = await CMS.findOne({ [name]: { $exists: true } });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data: doc,
  });
});

exports.postservices = catchAsync(async (req, res, next) => {
  if (req?.files?.icon) req.body.icon = req?.files?.icon[0].key;

  const data = await Card.create(req.body);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.updateservices = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { files } = req;

  /*   if (req?.files?.icon?.length > 0 && req?.files?.icon[0]?.fieldname) {
    req.body.icon = `icon-${req.user.id}-${Date.now()}.jpg`;

    const _path = path.join(
      __dirname,
      '..',
      'public',
      'img',
      'icons',
      `${req.body.icon}`
    );
    req.body.icon = 'img/icons/' + req.body.icon;

    // fs.writeFileSync(_path, req.files.icon[0].buffer, 'binary');
    fs.writeFile(_path, req.files.icon[0].buffer, (err, data) => {});
  }
 */
  if (files?.icon) req.body.icon = files.icon[0].key;

  const data = await Card.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.deleteservices = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const data = await Card.findByIdAndRemove(id);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
  });
});

// System Config Curd
exports.getconfig = catchAsync(async (req, res, next) => {
  const { key } = req.query;
  var config = await systemConfig.findOne({
    system_config_key: key,
  });

  if (config) {
    // SEND RESPONSE
    res.status(200).json({
      status: "success",
      value: config.system_config_value,
    });
  } else {
    res.status(200).json({
      status: "Not found",
      value: null,
    });
  }
});

exports.getAllconfig = catchAsync(async (req, res, next) => {
  const { key } = req.query;
  const data = await systemConfig.find();

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.postconfigs = catchAsync(async (req, res, next) => {
  const { key, value } = req.body;

  const data = await systemConfig.create({
    system_config_key: key,
    system_config_value: value,
  });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.updateconfigs = catchAsync(async (req, res, next) => {
  const { key, value } = req.body;

  const data = await systemConfig.findOneAndUpdate(
    { system_config_key: key },
    { system_config_value: value },
    { new: true }
  );

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.deleteconfigs = catchAsync(async (req, res, next) => {
  const { key } = req.query;

  const data = await systemConfig.findOneAndRemove({ system_config_key: key });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
  });
});

// System FAQ Curd

exports.getfaq = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  console.log({ id });

  const data = await Faq.findById(id);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getAllfaq = catchAsync(async (req, res, next) => {
  const data = await Faq.find();

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.postfaq = catchAsync(async (req, res, next) => {
  const data = await Faq.create(req.body);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.updatefaq = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const data = await Faq.findByIdAndUpdate(id, req.body, {
    new: true,
  });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.deletefaq = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const data = await Faq.findByIdAndRemove(id);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
  });
});
