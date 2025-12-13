const Stripe = require('stripe');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
let stripe = null;
let stripeInitializationError = null;
try {
  stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;
} catch (err) {
  console.error('Stripe initialization failed:', err.message);
  stripeInitializationError = err;
}
// Explicit debug flag that is ignored in production
const debugLoggingEnabled =
  process.env.STRIPE_WEBHOOK_DEBUG === 'true' &&
  process.env.NODE_ENV !== 'production';
const logDebug = (message, value) => {
  if (!debugLoggingEnabled) {
    return;
  }
  if (typeof value === 'function') {
    console.log(message, value());
  } else if (typeof value !== 'undefined') {
    console.log(message, value);
  } else {
    console.log(message);
  }
};
// Zero-decimal currencies sourced from Stripe documentation; update if Stripe changes list
const zeroDecimalCurrencies = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'vuv',
  'xaf',
  'xof',
  'xpf'
]);
const formatStripeAmount = (amount, currency) => {
  const amountTotal = amount ?? 0;
  const normalizedCurrency = (currency || '').toLowerCase();
  return zeroDecimalCurrencies.has(normalizedCurrency)
    ? amountTotal
    : amountTotal / 100;
};

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (stripeInitializationError || !stripe || !webhookSecret) {
    console.error('Missing Stripe configuration.', stripeInitializationError);
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const headers = event.headers || {};
  const sig = headers['stripe-signature'] || headers['Stripe-Signature'];
  if (!sig) {
    console.error('Missing Stripe signature header.');
    return { statusCode: 400, body: 'Missing Stripe signature header' };
  }
  let body = event.body;
  if (event.isBase64Encoded) {
    body = Buffer.from(event.body || '', 'base64');
  }
  const isValidBody = typeof body === 'string' || Buffer.isBuffer(body);
  if (!isValidBody) {
    console.error('Invalid webhook payload type.');
    return { statusCode: 400, body: 'Invalid webhook payload' };
  }

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      console.log('✅ checkout.session.completed event received');
      logDebug('Checkout session ID:', session.id);
      logDebug('Customer associated:', () => Boolean(session.customer));
      logDebug('Amount paid:', () =>
        formatStripeAmount(session.amount_total, session.currency)
      );

      // TODO: Send confirmation email
      // TODO: If oracle reading, send reading to customer (tracked separately)
      // TODO: If physical product, create Printful order (tracked separately)

      break;

    case 'payment_intent.succeeded':
      const paymentIntent = stripeEvent.data.object;
      console.log('✅ payment_intent.succeeded event received');
      logDebug('PaymentIntent ID:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = stripeEvent.data.object;
      console.error('❌ payment_intent.payment_failed event received');
      logDebug('PaymentIntent ID:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
