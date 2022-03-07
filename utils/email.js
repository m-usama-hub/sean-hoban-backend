const nodemailer = require("nodemailer");
const pug = require("pug");
const ejs = require("ejs");
const htmlToText = require("html-to-text");

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    // this.firstName = user.name.split(' ')[0];
    this.firstName = user.name;
    this.url = url;
    this.from = `Take of bill <${process.env.EMAIL_FROM}>`;
  }

  newTransport(email_server) {
    // Sendgrid

    switch (email_server) {
      case "smtp":
        return nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD,
          },
        });
        break;
      case "send_grid":
        return nodemailer.createTransport({
          service: "SendGrid",
          auth: {
            user: process.env.SENDGRID_USERNAME,
            pass: process.env.SENDGRID_PASSWORD,
          },
        });
      default:
        console.log("No email server specified.....!");
    }
  }

  // Send the actual email
  async send(template, subject, payload) {
    // 1) Render HTML based on a pug template
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      email: this.to,
      subject,
      payload,
    });
    console.log(this.to);

    // 2) Define email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html),
    };

    // 3) Create a transport and send email
    await this.newTransport(process.env.EMAIL_SERVER).sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send("welcome", "Welcome to the Take off bill!");
  }

  async sendEmailPassword(payload) {
    await this.send("pass", "Credentials", payload);
  }

  async subscriptionStatus(payload) {
    await this.send("subscription", "Subscription Status", payload);
  }

  async sendPasswordReset() {
    await this.send(
      "passwordReset",
      "Your password reset token (valid for only 10 minutes)"
    );
  }

  async sendPasswordResetComfirmation() {
    await this.send(
      "passwordResetComfirmation",
      "Take off bill Password Change Notification"
    );
  }

  async sendEmailVerificationEmail() {
    await this.send("EmailVerification", "Please verify you email");
  }
};
