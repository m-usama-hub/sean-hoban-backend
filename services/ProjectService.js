const AppError = require("../utils/appError");

exports.checkRequiredData = async (data, required, next) => {
  let dataKeys = Object.keys(data);
  required.forEach(function (value) {
    if (!dataKeys.includes(value)) {
      return next(
        new AppError(
          "Some thing is missing. Required data (" + required.toString() + ")",
          403
        )
      );
    }
  });
};

exports.currencySymbol = async (currency) => {
  return currency == "eur" ? "€" : "£";
};
exports.uploadImages = async (images) => {
  return [];
};
exports.uploadPdfs = async (pdfs) => {
  return [];
};
