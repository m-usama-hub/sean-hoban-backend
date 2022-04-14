const { CourierClient } = require("@trycourier/courier");
const EmailRequest = require("../models/emailRequestModel");

module.exports = class Email {
  constructor(user, data, template) {
    this.data = data;
    this.email = user.email;
    this.id = user._id;
    this.isEmailActive = user.isEmailActive;
    this.courier = CourierClient({
      authorizationToken: process.env.COURIER_CLIENT_KRY,
    });

    this.template = template;
  }

  async getTemplateId() {
    let templates = {
      welcome: "C1PNPMV1XCMTW1HWWKJ8MZ51XEAE",
      verify: "HHQTQZAXG5MFW9P8A1J1X49AM824",
      passwordReset: "530VCQ6CHKM7AHNF1ERA24FJDJ66",
      projectPosted: "43XN61NWVRMDY3GET0JHP08W04DX",
      propsalPosted: "3CQ2PRVWQC4EEXJFVD421HF68KWK",
    };

    return templates[this.template];
  }

  async Send() {
    if (this.isEmailActive == true) {
      const { requestId } = await this.courier.send({
        message: {
          to: {
            email: this.email,
          },
          template: await this.getTemplateId(),
          data: this.data,
        },
      });

      await this.addRequest(requestId);
    }
  }

  async addRequest(requestId) {
    await EmailRequest.create({
      requestId,
      data: this.data,
      user: this.id,
    });
  }
};
