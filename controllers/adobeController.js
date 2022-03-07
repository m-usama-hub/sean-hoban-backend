const PDFDocument = require("pdfkit");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
var axios = require("axios");
var FormData = require("form-data");
const path = require("path");
var pdf = require("pdf-creator-node");

const creds = {
  Authorization:
    "Bearer 3AAABLblqZhAYsTAhjBfBG4jxsonFS4cHD5iAVTNHItprQAqDyGsKsq7RDKt2gJqY2nMTvSyJLTJin3_LFSNtzlPl6feN8yjD",
  "x-api-user": "email:ab@tafsol.com",
};

exports.createTrasitionDoc = () => {
  const pdfname = `usama.pdf`;
  // creating PDF here with the given text
  let pdfDoc = new PDFDocument();
  const _path = path.join(__dirname, "..", "public", "pdfs", pdfname);

  console.log(_path);

  pdfDoc.pipe(fs.createWriteStream(_path));
  pdfDoc.text("this is dummy pdf");
  pdfDoc.end();

  var data = new FormData();
  data.append("File-Name", pdfname);
  data.append("File", fs.createReadStream(_path));

  var config = {
    method: "post",
    url: "https://api.sg1.adobesign.com/api/rest/v6/transientDocuments",
    headers: {
      ...creds,
      ...data.getHeaders(),
    },
    data: data,
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
};

exports.createAgreement = (transientDocumentId) => {
  var data = JSON.stringify({
    fileInfos: [
      {
        transientDocumentId,
      },
    ],
    name: "API Send Transient Test Agreement 109",
    participantSetsInfo: [
      {
        memberInfos: [
          {
            email: "usamaamjad.tafsol@gmail.com",
          },
        ],
        order: 1,
        role: "SIGNER",
      },
    ],
    signatureType: "ESIGN",
    state: "IN_PROCESS",
  });

  var config = {
    method: "post",
    url: "https://api.sg1.adobesign.com/api/rest/v6/agreements",
    headers: {
      ...creds,
      "Content-Type": "application/json",
    },
    data: data,
  };

  axios(config)
    .then(function (response) {
      console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
};

exports.getReport = (agreementId) => {
  const pdfname = `signed1.pdf`;
  const _path = path.join(__dirname, "..", "public", "pdfs", pdfname);
  var config = {
    method: "get",
    url: `https://api.sg1.adobesign.com/api/rest/v6/agreements/${agreementId}/combinedDocument`,
    responseType: "stream",
    headers: {
      ...creds,
    },
  };
  axios(config)
    .then(async (response) => {
      response.data.pipe(fs.createWriteStream(_path));
    })
    .catch(function (error) {
      console.log(error);
    });
};
