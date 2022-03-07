const { customer } = require("../utils/stripe");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const catchAsync = require("../utils/catchAsync");

exports.CreateStripeCustomer = async (email) => {
  return await customer(email);
};

exports.MakePayment = async (amount, pmId, currency, next) => {};

exports.MakePaymentIntent = async (amount, pmId, currency, cus_id, next) => {
  const params = {
    payment_method_types: ["card"],
    payment_method: pmId,
    customer: cus_id,
    amount,
    currency,
  };

  // for buying one time product
  let clientPaymentIntents = await stripe.paymentIntents.create(params);

  return clientPaymentIntents.id;
};

exports.ConfirmPaymentIntent = async (paymentIntentId, pmId) => {
  const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method: pmId,
  });

  return paymentIntent.status != "succeeded" ? false : true;
};

exports.createPaymentMethod = catchAsync(async (req, res, next) => {
  const paymentMethod = await stripe.paymentMethods.create({
    type: "card",
    card: {
      number: "4242424242424242",
      exp_month: 2,
      exp_year: 2023,
      cvc: "314",
    },
  });

  res.status(200).json({
    status: "success",
    data: paymentMethod,
  });
});
