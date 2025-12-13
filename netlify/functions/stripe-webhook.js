const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;
// Explicit debug flag that is ignored in production
const debugLoggingEnabled =
  process.env.STRIPE_WEBHOOK_DEBUG === 'true' &&
  process.env.NODE_ENV !== 'production';
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

  if (!stripe || !webhookSecret) {
    console.error('Missing Stripe configuration.');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const sig = event.headers['stripe-signature'];
  if (!sig) {
    console.error('Missing Stripe signature header.');
    return { statusCode: 400, body: 'Missing Stripe signature header' };
  }

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      console.log('✅ Payment successful:', session.id);
      if (debugLoggingEnabled) {
        const amountPaid = formatStripeAmount(
          session.amount_total,
          session.currency
        );
        console.log('Customer associated:', Boolean(session.customer));
        console.log('Amount paid:', amountPaid);
      }

      // TODO: Send confirmation email
      // TODO: If oracle reading, send reading to customer
      // TODO: If physical product, create Printful order

      break;

    case 'payment_intent.succeeded':
      const paymentIntent = stripeEvent.data.object;
      console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = stripeEvent.data.object;
      console.error('❌ Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
