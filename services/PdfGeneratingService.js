const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const numeral = require("numeral");
const currencies = require("../currencies.json");
const { uploadServerFile } = require("../utils/s3");

exports.createInvoice = async (invoice, filePath) => {
  let doc = new PDFDocument({ margin: 50 });
  let testdoc = new PDFDocument({ margin: 50 });

  generateHeader(doc);
  generateProjectDetails(doc, invoice);
  generateMilestoneDetails(doc, invoice);
  generateCustomerInformation(doc, invoice);
  //   generateInvoiceTable(doc, invoice);
  //   generateFooter(doc);
  const contentFile = await fs.createWriteStream(filePath);
  doc.pipe(contentFile);
  doc.end();

  // new Promise((resolve) => {
  //   return setTimeout(async () => {
  //     const uploaded = await uploadServerFile(filePath, contentFile);

  //     console.log({ a: 99 });
  //     return resolve(uploaded);
  //   }, 3000);
  // })
  //   .then((rs) => {
  //     console.log({ rs }, "successfully done :)");
  //   })
  //   .catch((er) => console.log(er, "fail :("));

  await setTimeout(async () => {
    let uploaded = await uploadServerFile(filePath);
  }, 3000);
};

async function generateHeader(doc) {
  doc
    .image("./public/Logo-01.png", 50, 45, {
      width: 100,
    })
    .fillColor("#444444")
    .fontSize(20)
    .fontSize(10)
    .text("123 Main Street", 200, 65, { align: "right" })
    .text("New York, NY, 10025", 200, 80, { align: "right" });
}

async function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "Payment is due within 15 days. Thank you for your business.",
      50,
      780,
      { align: "center", width: 500 }
    );
}

async function generateProjectDetails(doc, invoice) {
  doc
    .text(`Project Tilte: ${invoice.project.title}`, 50, 120)
    .text(`Project Description: ${invoice.project.description}`, 50)
    .text(
      `Amount: ${
        currencies[invoice.project.currency.toUpperCase()].symbol
      } ${numeral(invoice.milestone.amount).format("0,0")}`,
      50
    )
    .text(`status: ${invoice.project.projectStatus}`, 50)
    .moveDown();
}

async function generateMilestoneDetails(doc, invoice) {
  doc
    .text(`Milestione Tilte: ${invoice.milestone.title}`, 50)
    .text(`Milestone Description: ${invoice.milestone.description}`, 50)
    .text(
      `Amount to Pay:${
        currencies[invoice.project.currency.toUpperCase()].symbol
      } ${numeral(invoice.milestone.amount).format("0,0")}`,
      50
    )
    .text(`status: ${invoice.milestone.status}`, 50)
    .moveDown();
}

async function generateCustomerInformation(doc, invoice) {
  console.log(
    "=================================In generateCustomerInformation"
  );
  doc
    .text(`To: ${invoice.user.name}`, 50)
    .text(`Email: ${invoice.user.email}`, 50)
    .text("-------------", 50)
    .text(`Invoice By: ${invoice.from?.name}`, 50)
    .text(`Invoice By email: ${invoice.from?.email}`, 50)
    .text(`Invoice Date: ${new Date()}`, 50)
    .text(
      `_________________________________________________________________________________________`,
      50
    )
    .text(`Total Amount: `, 50)
    .text(
      currencies[invoice.project.currency.toUpperCase()].symbol +
        " " +
        numeral(invoice.milestone.amount).format("0,0"),
      510
    )
    .moveDown();
}

async function generateTableRow(doc, y, c1, c2, c3, c4, c5) {
  doc
    .fontSize(10)
    .text(c1, 50, y)
    .text(c2, 150, y)
    .text(c3, 280, y, { width: 90, align: "right" })
    .text(c4, 370, y, { width: 90, align: "right" })
    .text(c5, 0, y, { align: "right" });
}

async function generateInvoiceTable(doc, invoice) {
  let i,
    invoiceTableTop = 330;

  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.title,
      item.description,
      item.status,
      numeral(item.amount).format("0,0")
    );
  }
}
