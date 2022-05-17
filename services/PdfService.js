const fs = require("fs");
const path = require("path");
var pdf = require("dynamic-html-pdf");
const { uploadServerFile } = require("../utils/s3");

module.exports = class PdfService {
  constructor(data, template, _path) {
    this.data = data;
    this.template = template;
    this._path = _path;
  }

  async getTemplate() {
    return fs.readFileSync(
      path.join(__dirname, "..", "views", "email", "html", this.template),
      "utf8"
    );
  }

  async Generate() {
    var options = {
      format: "A4",
      orientation: "portrait",
      border: "10mm",
    };

    var invoiceData = this.data;

    var document = {
      type: "file", // 'file' or 'buffer'
      template: await this.getTemplate(),
      context: {
        ...invoiceData,
        date: `Invoice Date: ${new Date()}`,
      },
      path: this._path, // it is not required if type is buffer
    };

    // console.log({ invoiceData });

    pdf.registerHelper("ifCond", function (v1, v2, options) {
      if (v1 === v2) {
        return options.fn(this);
      }
      return options.inverse(this);
    });

    pdf
      .create(document, options)
      .then((res) => {
        uploadServerFile(this._path);
        setTimeout(() => {
          fs.unlinkSync(this._path);
        }, 1000);
      })
      .catch((error) => {
        console.error(error);
      });

    return true;
  }
};
