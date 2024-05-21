/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
const functions = require("firebase-functions");
const stripe = require('stripe')(functions.config().stripe.testkey);

const calculateOrderAmount = (items) => {
  prices = [];
  catalog = [
    {"id": "0", "price": 1.99},
    {"id": "1", "price": 2.99},
    {"id": "2", "price": 19.99},
    {"id": "3", "price": 49.99},
  ];

  items.forEach((item) => {
    price = catalog.find((x) => x.id == item.id).price;
    prices.push(price);
  });

  return parseInt(prices.reduce((a, b) => a + b) * 100);
};

const generateResponse = function (paymentIntent) {
  switch (paymentIntent.status) {
    case 'requires_action':
      return {
        clientSecret: paymentIntent.client_secret,
        requiresAction: true,
        status: paymentIntent.status,
    };
    case 'requires_payment_method':
      return {
        'error' : 'Your card was denied, please provide a new payment method',
      }
      case 'succeeded':
        console.log('💰 Payment received!');
        return {
          clientSecret: paymentIntent.client_secret,
          status: paymentIntent.status,
        };
    }
    return {error: 'Failed' };
}

exports.StripePayEndpointMethodId = functions.https.onRequest(async (req, res) => {
  const { paymentMethodId, items, currency, useStripeSdk } = req.body;
  const orderAmount = calculateOrderAmount(items);
  try {
    if (paymentMethodId) {
      // Create the PaymentIntent
      const params = {
        amount: orderAmount,
        currency: 'usd',
        payment_method: paymentMethodId,
        confirmation_method: 'manual',
        confirm: true,
        use_stripe_sdk: useStripeSdk,
      };
      const paymentIntent = await stripe.paymentIntents.create(params);
      console.log(paymentIntent);
      return res.send(generateResponse(paymentIntent));
    }
    return res.sendStatus(400);
  } catch (error) {
    console.error(error);
    return res.send({error: error.message });
  }
});

exports.StripePayEndpointIntentId = functions.https.onRequest(async (req, res) => {
  const { paymentIntentId } = req.body;
  try {
    if (paymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      console.log(paymentIntent);
      return res.send(generateResponse(paymentIntent));
    }
    return res.sendStatus(400);
  } catch (error) {
    return res.send({error: error.message });
  }
});
// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
