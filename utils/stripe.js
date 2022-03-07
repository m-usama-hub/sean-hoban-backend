const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const moment = require("moment");
const User = require("../models/userModel");
const catchAsync = require("./catchAsync");
const AppError = require("./appError");
const Email = require("../utils/email");

// creating customer account on signup
exports.customer = (email, description = null) => {
  if (!email) throw "Email is required";
  return stripe.customers.create({
    email,
    description,
  });
};

/* // cancelling subscription here
exports.cancelCurrentSubscription = (subscription) => {
  if (!subscription) throw 'subscription id is required';

  return stripe.subscriptions.del(subscription);
}; */

// cancelling subscription + updating user here
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  // const { subscription } = req.body;
  const { user } = req;

  if (!user?.subscription)
    return next(new AppError("Sorry, No current subscription found.", 400));

  const deleted = await stripe.subscriptions.del(user.subscription);

  if (!deleted)
    return next(new AppError("Sorry, No current subscription found.", 400));

  /* 
    _id:619d62731d00009c62905d,
    subscription:"sub_1Jz6xwHOV99999jJdJS7oBP",
    plan:"price_1JkBwHHOVyleiVH6666hk2", 
  */

  const data = await User.findByIdAndUpdate(
    user._id,
    {
      // istrialEnd: true,
      // premium: false,
      plan: null,
      subscriptionType: "none",
      isSubscriptionOn: false,
      subscription: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
    },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    data,
  });
});

// renew subscription + updating user here
exports.subscriptionRenew = catchAsync(async (req, res, next) => {
  try {
    const signature = req.headers["stripe-signature"];
    // let notification = null;
    let obj = null;

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // console.log('#############################################');
    // console.log({ event: event.data.object });
    // console.log({ event: event.type });
    // //  event.data.object.customer_email,
    // console.log('#############################################');

    if (event.type === "invoice.payment_succeeded") {
      const subscription = await stripe.subscriptions.retrieve(
        event.data.object.subscription
      );

      const tags = await stripe.products.retrieve(
        subscription.items.data[0].price.product
      );

      obj = {
        // istrialEnd: true,
        subscription: subscription.id,
        subscriptionType: tags.metadata.subscriptionType,
        isSubscriptionOn: true,
        plan: subscription.plan.id,
        subscriptionStartDate: subscription.current_period_start * 1000,
        subscriptionEndDate: subscription.current_period_end * 1000,
      };

      const newUser = await User.findOneAndUpdate(
        { email: event.data.object.customer_email },
        obj
      );
      const payload = {
        message: "Subscription Renewed",
      };
      const url = process.env.CLIENT_URL;
      await new Email(newUser, url)
        .subscriptionStatus(payload)
        .catch((e) => console.log(e));
    }

    /*   // if invoice.payment_action_required
  if (event.type === 'invoice.payment_action_required') {
    // notification = {
    //   message:
    //     'Renew your subscription, there are some action required regarding the payment.',
    //   isSeen: false,
    //   status: 'warning',
    // };
    // TODO notification
    // const uid = await User.findOneAndUpdate(
    //   {
    //     email: event.data.object.customer_email,
    //   },
    //   {
    //     $push: { notifications: notification },
    //   },
    //   { new: true }
    // );
  }
 */

    // if invoice.payment_failed
    if (event.type === "invoice.payment_failed") {
      // notification = {
      //   message: 'Your subscription is ended, please re-subscribe the plan.',
      //   isSeen: false,
      //   status: 'error',
      // };

      // Notification
      const newUser = await User.findOneAndUpdate(
        {
          email: event.data.object.customer_email,
        },
        {
          plan: null,
          subscriptionType: "none",
          isSubscriptionOn: false,
          subscription: null,
          subscriptionStartDate: null,
          subscriptionEndDate: null,
        },
        { new: true }
      );
      const payload = {
        message: "Subscription Failed",
      };

      const url = process.env.CLIENT_URL;
      // await new Email(newUser, url)
      //   .subscriptionStatus(payload)
      //   .catch((e) => console.log(e));
    }
  } catch (e) {
    console.log({ e });
    return res.status(400).json({
      status: "fail",
    });
  }

  res.status(200).json({
    status: "success",
    // data,
  });
});

// Stripe payment methods start
const paymentMethodList = async (cus) => {
  if (!cus) throw "Customer id is required";

  return await stripe.paymentMethods.list({
    customer: cus,
    type: "card",
  });
};

// CONTROLLER returns all attached(saved) payment cards including new one
exports.AttachedPaymentMethod = catchAsync(async (req, res, next) => {
  const { pmId } = req.body;

  if (!pmId) return next(new AppError("PMID is required", 400));

  await stripe.paymentMethods.attach(pmId, {
    customer: req?.user?.cus,
  });

  const list = await paymentMethodList(req?.user?.cus);

  res.status(200).json({
    status: "success",
    data: list?.data,
  });
});

// CONTROLLER returns all attached(saved) payment cards
exports.getPaymentMethods = catchAsync(async (req, res, next) => {
  const list = await paymentMethodList(req.user.cus);

  res.status(200).json({
    status: "success",
    data: list?.data,
  });
});

// CONTROLLER returns all attached(saved) payment cards after removing the desired one
exports.deattachPaymentMethod = catchAsync(async (req, res, next) => {
  const { pmId } = req.body;

  if (!pmId) return next(new AppError("PMID is required", 400));

  await stripe.paymentMethods.detach(pmId);

  const list = await paymentMethodList(req.user.cus);

  res.status(200).json({
    status: "success",
    data: list.data,
  });
});

// ALL STRIPE product list :)
exports.productList = catchAsync(async (req, res, next) => {
  const products = await stripe.products.list({
    limit: 300,
  });

  // if (!pmId) return next(new AppError('PMID is required', 400));

  res.status(200).json({
    status: "success",
    results: products.data.length,
    data: products.data,
  });
});

const getproduct = async (prodId) => await stripe.products.retrieve(prodId);

// fetching all subscription plans from stripe and add descriptions from DB
exports.subscriptionPlans = catchAsync(async (req, res, next) => {
  const subscriptions = await stripe.prices.list();
  // const subscriptions = await stripe.products.list();

  // getting all products from DB
  // const _products = await Product.find({});

  const prom_arr = subscriptions.data.map(async (value, i) => {
    const product = await getproduct(value.product);
    subscriptions.data[i].product = product;
    return product;
  });

  await Promise.all(prom_arr);

  // adding description here
  // const rs = subscriptions.data.map((plan) => {
  //   _products.forEach((prd) => {
  //     if (plan?.product?.id == prd?.prodId) {
  //       plan.product.description = prd.description;
  //     }
  //   });
  //   return plan;
  // });

  // // sorting by price
  // let plans = rs.sort((a, b) => a.amount - b.amount);

  // console.log('plans', plans);

  res.status(200).json({
    status: "success",
    results: subscriptions.data?.length,
    data: subscriptions.data,
  });
});

// creating and updating subscription
exports.createSubscription = catchAsync(async (req, res, next) => {
  let obj = null;
  let subscription = null;
  let newUser = null;

  const { priceId, paymentMethodId, premium, voucherCode } = req.body;

  if (!priceId || !paymentMethodId) {
    return next(new AppError("plan or paymentMethodId is missing.", 400));
  }
  const { user } = req;

  const price = await stripe.prices.retrieve(priceId);

  const product = await getproduct(price.product);

  // voucher here
  // const [calculatedPrice, err] = await voucherCalculation(voucherCode, price);

  if (err) return next(new AppError(err.message, 400));

  // for buying one time product
  subscription = await stripe.paymentIntents.create({
    amount: calculatedPrice,
    currency: "gbp",
    payment_method: paymentMethodId,
    payment_method_types: ["card"],
    customer: user.cus,
  });

  const paymentConfrim = await stripe.paymentIntents.confirm(subscription.id);

  if (paymentConfrim.status === "succeeded") {
    obj = {
      subscription: subscription.id,
      isSubscriptionOn: true,
      plan: subscription.id,
      // subscriptionType: tags.subscriptionType,
      subscriptionStartDate: Date.now(),
      subscriptionEndDate: moment()
        .add(product.unit_label.split("-")[1] * 1, "months")
        .format(),
    };

    newUser = await User.findByIdAndUpdate(user._id, obj, { new: true });
  } else {
    return next(
      new AppError("Sorry, facing error purchasing subscription.", 500)
    );
  }

  res.status(200).json({
    status: "success",
    data: newUser,
  });
});

// creating and updating subscription
exports.klarnaSubscription = catchAsync(async (req, res, next) => {
  const { payment_intent, priceId } = req.query;
  let newUser = null;

  if (!priceId) return next(new AppError("priceId is missing.", 400));

  if (!payment_intent)
    return next(
      new AppError("Error, While processing the payment request.", 400)
    );

  const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);

  // getting price id (if we need this for future)
  const price = await stripe.prices.retrieve(priceId);

  const product = await getproduct(price.product);

  const email =
    paymentIntent["charges"]?.["data"]?.[0]?.["billing_details"]?.["email"];

  if (!email)
    return next(
      new AppError(
        "No email is found, While processing the payment request.",
        400
      )
    );

  const obj = {
    subscription: "pi_3KQxSPCVf0eQsmps0oAu0YpN",
    isSubscriptionOn: true,
    plan: "pi_3KJmuBCVf0eQsmps050FowYr",
    // subscriptionType: tags.subscriptionType,
    subscriptionStartDate: Date.now(),
    subscriptionEndDate: moment()
      .add(product.unit_label.split("-")[1] * 1, "months")
      .format(),
  };

  newUser = await User.findOneAndUpdate({ email }, obj, { new: true });
  if (!newUser)
    return next(
      new AppError("Error, While processing the payment request.", 400)
    );

  res.status(200).json({
    status: "success",
    data: newUser,
  });
});

exports.applePaySubscription = catchAsync(async (req, res, next) => {
  const { priceId } = req.query;
  const { user } = req;
  let newUser = null;

  if (!priceId) return next(new AppError("priceId is missing.", 400));

  // if (!payment_intent)
  //   return next(
  //     new AppError('Error, While processing the payment request.', 400)
  //   );

  // getting price id (if we need this for future)
  const price = await stripe.prices.retrieve(priceId);

  const product = await getproduct(price.product);

  const obj = {
    subscription: "pi_3KQxSPCVf0eQsmps0oAu0YpN",
    isSubscriptionOn: true,
    plan: "pi_3KJmuBCVf0eQsmps050FowYr",
    // subscriptionType: tags.subscriptionType,
    subscriptionStartDate: Date.now(),
    subscriptionEndDate: moment()
      .add(product.unit_label.split("-")[1] * 1, "months")
      .format(),
  };

  newUser = await User.findByIdAndUpdate(user._id, obj, {
    new: true,
  });
  if (!newUser)
    return next(
      new AppError("Error, While processing the payment request.", 400)
    );

  res.status(200).json({
    status: "success",
    data: newUser,
  });
});

// creating and updating subscription
exports.createPaymentIntent = catchAsync(async (req, res, next) => {
  const { priceId } = req.body;

  if (!priceId) return next(new AppError("priceId is missing.", 400));

  const price = await stripe.prices.retrieve(priceId);

  const params = {
    payment_method_types: ["klarna"],
    amount: price.unit_amount,
    currency: "gbp",
  };

  // for buying one time product
  let clientPaymentIntents = await stripe.paymentIntents.create(params);

  res.status(200).json({
    status: "success",
    clientSecret: clientPaymentIntents.client_secret,
  });
});

// creating and updating subscription => for apple pay/card pay
exports.createSimplePaymentIntent = catchAsync(async (req, res, next) => {
  const { priceId } = req.body;

  if (!priceId) return next(new AppError("priceId is missing.", 400));

  const price = await stripe.prices.retrieve(priceId);

  const params = {
    payment_method_types: ["card"],
    amount: price.unit_amount,
    currency: "gbp",
  };

  // for buying one time product
  let clientPaymentIntents = await stripe.paymentIntents.create(params);

  res.status(200).json({
    status: "success",
    clientSecret: clientPaymentIntents.client_secret,
  });
});

/* 
const sharp = require("sharp");

async function resizeImage() {
  try {
    await sharp("sammy.png")
      .resize({
        width: 150,
        height: 97
      })
      .toFormat("jpeg", { mozjpeg: true })
      .toFile("sammy-resized-compressed.jpeg");
  } catch (error) {
    console.log(error);
  }
}

resizeImage(); 
*/

exports.paymentMethodList = paymentMethodList;
