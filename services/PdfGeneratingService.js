const PDFDocument = require("pdfkit");
const fs = require("fs");
const numeral = require("numeral");
const currencies = require("../currencies.json");
const { uploadServerFile } = require("../utils/s3");

exports.createInvoice = async (invoice, filePath) => {
  let doc = new PDFDocument({ margin: 50 });
  new PDFDocument({ margin: 50 });

  generateHeader(doc);
  generateProjectDetails(doc, invoice);
  let mileArray = invoice.milestone;
  if (Array.isArray(mileArray)) {
    generateInvoiceTable(doc, invoice);
  } else {
    generateMilestoneDetails(doc, invoice);
  }
  generateCustomerInformation(doc, invoice);

  //   generateInvoiceTable(doc, invoice);
  //   generateFooter(doc);
  const contentFile = await fs.createWriteStream(filePath);
  doc.pipe(contentFile);
  doc.end();

  // await setTimeout(async () => {
  // await uploadServerFile(filePath);
  // fs.unlinkSync(filePath);
  // }, 3000);
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
      } ${numeral(invoice.project.amount).format("0,0")}`,
      50
    )
    .text(`status: ${invoice.project.projectStatus}`, 50)
    .moveDown();
}

async function generateMilestoneDetails(doc, invoice) {
  let mileArray = invoice.milestone;
  if (Array.isArray(mileArray)) {
    invoice.milestone.forEach((element) => {
      doc
        .text(`Milestione Tilte: ${element.title}`, 50)
        .text(
          `Amount:${
            currencies[invoice.project.currency.toUpperCase()].symbol
          } ${numeral(element.amount).format("0,0")}`,
          50
        )
        .text(`status: ${element.status}`, 50)
        .moveDown();
    });
  } else {
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
}

async function generateCustomerInformation(doc, invoice) {
  // let amount;
  // let mileArray = invoice.milestone;

  // if (Array.isArray(mileArray)) {
  //   amount = invoice.milestone.reduce((acc, curr) => curr.amount + acc, 0);
  // } else {
  //   amount = invoice.milestone.amount;
  // }

  doc
    .text(`To: ${invoice.user.name}`, 50)
    .text(`Email: ${invoice.user.email}`, 50)
    .text("-------------", 50)
    .text(`Invoice By: ${invoice.from?.name}`, 50)
    .text(`Invoice By email: ${invoice.from?.email}`, 50)
    .text(`Invoice Date: ${new Date()}`, 50)
    // .text(
    //   `_________________________________________________________________________________________`,
    //   50
    // )
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
    .text(c2, 150, y, { width: 90, align: "center" })
    .text(c3, 250, y, { width: 90, align: "center" })
    .text(c4, 350, y, { width: 90, align: "center" });
  // .text(c5, 0, y, { align: "right" });
}

async function generateInvoiceTable(doc, invoice) {
  let i,
    invoiceTableTop = 150;

  let mileArray = invoice.milestone;

  doc.text("Milestones Beakdown:", 50, invoiceTableTop + 20);
  // doc.text("-------", 50, invoiceTableTop + 20);

  for (i = 0; i < mileArray.length; i++) {
    if (i == 0) {
      generateTableRow(
        doc,
        invoiceTableTop + (i + 1.5) * 20,
        "TITLE",
        "AMOUNT",
        "WORKING STATUS",
        "PAYMENT STATUS"
      );
    }

    const item = mileArray[i];
    const position = invoiceTableTop + (i + 1.5) * 30;
    generateTableRow(
      doc,
      position,
      item.title,
      currencies[invoice.project.currency.toUpperCase()].symbol +
        " " +
        numeral(item.amount).format("0,0"),
      item.status,
      item.isMilestonePaid == true ? "Paid" : "Payment Pending"
    );
  }
}
