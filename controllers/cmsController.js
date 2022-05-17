const Cms = require("../models/cmsModel");
// const webservice = require('../models/webServiceModel');
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
// const SEO = require('../models/seoModel');
const { deleteFile } = require("../utils/s3");
const Page = require("../models/pageCrudModel");
const Contact = require("../models/contactModel");

exports.getPage = catchAsync(async (req, res, next) => {
  let { page } = req.params;
  let { crudsArry } = req.query;
  let doc = await Cms.findOne({ [page]: { $exists: true } });

  let requiredData = await Page.find({ secName: { $in: crudsArry ?? [] } });

  let requiredArrays = [];
  if (crudsArry?.length > 0) {
    requiredData.forEach((arr) => {
      if (requiredArrays[arr.secName]) {
        requiredArrays[arr.secName].push(arr);
      } else {
        requiredArrays[arr.secName] = [arr];
      }
    });
  }

  let contactDetails;

  if (page == "footer") {
    contactDetails = await Cms.findOne({
      contact_us: { $exists: true },
    });
    requiredArrays["contactDetails"] = { ...contactDetails.contact_us };
  }

  let data = {
    ...doc[page],
    ...requiredArrays,
  };

  res.status(200).json({
    status: "success",
    data,
  });
});

exports.updatePage = catchAsync(async (req, res, next) => {
  let { _id, pageName } = req.body;
  const { files } = req;

  if (!_id || !pageName) return next(new AppError("args are missing.", 400));

  let outter = {
    [pageName]: { ...req.body },
  };

  req.body[pageName] = outter[pageName];

  const doc = await Cms.findById(_id);

  if (files?.image) {
    if (pageName == "home") {
      if (doc?.[pageName]?.sec1Image)
        await deleteFile(doc?.[pageName]?.sec1Image);
      req.body[pageName].sec1Image = files.image[0].key;
    } else if (pageName == "order") {
      if (doc?.[pageName]?.sec3Image)
        await deleteFile(doc?.[pageName]?.sec3Image);
      req.body[pageName].sec3Image = files.image[0].key;
    }
  }

  if (files?.sec1CoverImage) {
    if (doc?.[pageName]?.sec1CoverImage)
      await deleteFile(doc?.[pageName]?.sec1CoverImage);
    req.body[pageName].sec1CoverImage = files.sec1CoverImage[0].key;
  }

  if (files?.sec2CoverImage) {
    if (doc?.[pageName]?.sec2CoverImage)
      await deleteFile(doc?.[pageName]?.sec2CoverImage);
    req.body[pageName].sec2CoverImage = files.sec2CoverImage[0].key;
  }

  if (files?.sec3Image) {
    if (doc?.[pageName]?.sec3Image)
      await deleteFile(doc?.[pageName]?.sec3Image);
    req.body[pageName].sec3Image = files.sec3Image[0].key;
  }

  if (files?.video) {
    if (pageName == "home") {
      if (doc?.[pageName]?.sec4Video)
        await deleteFile(doc?.[pageName]?.sec4Video);
      req.body[pageName].sec4Video = files.video[0].key;
    } else if (pageName == "about_us") {
      if (doc?.[pageName]?.sec3Video)
        await deleteFile(doc?.[pageName]?.sec3Video);
      req.body[pageName].sec3Video = files.video[0].key;
    }
  }

  console.log({ contactBody: req.body });

  let result = await Cms.findByIdAndUpdate(_id, req.body, {
    new: true,
    upsert: true,
  });

  // console.log({ result });

  res.status(200).json({
    status: "success",
    data: result,
  });
});

exports.getDynamicPage = catchAsync(async (req, res, next) => {
  let {
    pages,
    goals,
    service,
    aboutusItem,
    faq,
    all,
    sources,
    privacyPolicy,
    termAndCondition,
  } = req.query;

  // let a = `[\"contactus\",\"home\"]`;
  // let arr = JSON.parse(a);
  if (all == "true") {
    const d = await Cms.find({});
    const pagesDynamicArray = [
      "home",
      "services",
      "order",
      "about_us",
      "contact_us",
      "terms_and_condition",
      "footer",
      "privacy_policy",
      "privacy_policy_2",
    ];
    let newArray = [];
    d.map((item, i) => {
      pagesDynamicArray.map((pg) => {
        if (item[pg]) {
          item[pg]._id = item?._id;
          newArray.push(item[pg]);
        }
      });
    });

    res.status(200).json({
      status: "success",
      results: newArray.length,
      data: newArray,
    });
  } else {
    return res.status(200).json({
      status: "success",
      data: [],
    });
  }
});

exports.getAllservices = catchAsync(async (req, res, next) => {
  const { type } = req.query;

  const service = await webservice.find({ type: type });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data: service,
  });
});

exports.getservices = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const service = await webservice.findById(id);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data: service,
  });
});

exports.postservices = catchAsync(async (req, res, next) => {
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

    console.log({ here: req.body.icon });
    // fs.writeFileSync(_path, req.files.icon[0].buffer, 'binary');
    fs.writeFile(_path, req.files.icon[0].buffer, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        console.log('Uploaded');
      }
    });
  } */
  if (files?.icon) req.body.icon = files.icon[0].key;

  const data = await webservice.create(req.body);

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

  const data = await webservice.findByIdAndUpdate(id, req.body, {
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

  const data = await webservice.findByIdAndRemove(id);

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
  });
});

// Page Seo Curd

exports.getPageSeoData = catchAsync(async (req, res, next) => {
  const { pageName } = req.params;
  const data = await SEO.findOne({ pageName: pageName });

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.postPageSeoData = catchAsync(async (req, res, next) => {
  const { isEdit } = req.query;
  const { pageName } = req.params;

  console.log(req.body);

  // if (req?.files?.image?.length > 0 && req?.files?.image[0]?.fieldname) {
  //   req.body.image = `image-${req.body.pageName}-${Date.now()}.jpg`;
  //   const _path = path.join(
  //     __dirname,
  //     '..',
  //     'public',
  //     'img',
  //     `${req.body.image}`
  //   );
  //   req.body.image = 'img/' + req.body.image;
  //   fs.writeFile(_path, req.files.image[0].buffer, (err, data) => {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       console.log('Uploaded');
  //     }
  //   });
  // }
  if (req?.files?.image) req.body.image = req?.files.image[0].key;
  let data = [];
  if (isEdit == "true") {
    data = await SEO.findOneAndUpdate({ pageName: pageName }, req.body, {
      new: true,
    });
  } else {
    data = await SEO.create(req.body);
  }

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});

exports.getContacts = catchAsync(async (req, res, next) => {
  const data = await Contact.find({});

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});
exports.deleteContacts = catchAsync(async (req, res, next) => {
  let { id } = req.query;

  await Contact.findByIdAndRemove(id);
  const data = await Contact.find({});

  // SEND RESPONSE
  res.status(200).json({
    status: "success",
    data,
  });
});
