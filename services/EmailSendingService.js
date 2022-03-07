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
      welcome: "YW7TXVKEY74D44HWZ7XBYR9HVP5K",
      verify: "3Y0C96MQWMMPSWQM8YGMXFPHAEF5",
      passwordReset: "E3TNFF4RSAMECCMAA97BRHNYH0PR",
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
