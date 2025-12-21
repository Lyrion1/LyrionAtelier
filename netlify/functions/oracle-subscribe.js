const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const siteUrl = process.env.SITE_URL || process.env.URL || 'https://lyrionatelier.com';
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

const priceMap = {
  cosmic: process.env.STRIPE_PRICE_ORACLE_COSMIC,
  mastery: process.env.STRIPE_PRICE_ORACLE_MASTERY
};

const buildResponse = (statusCode, payload) => ({
  statusCode,
  body: JSON.stringify(payload),
  headers: { 'Content-Type': 'application/json' }
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method Not Allowed' });
  }

  if (!stripe) {
    return buildResponse(500, { error: 'Stripe is not configured' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (err) {
    return buildResponse(400, { error: 'Invalid request body' });
  }

  const { tier } = body || {};
  const email = body?.email;
  const normalizedTier = tier;
  const priceId = priceMap[normalizedTier];

  if (!priceId) {
    return buildResponse(400, { error: 'Unknown subscription tier' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      success_url: `${siteUrl}/oracle.html?subscription=success`,
      cancel_url: `${siteUrl}/oracle.html?subscription=cancelled`,
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      metadata: {
        product_type: 'oracle_conversation',
        subscription_type: normalizedTier
      }
    });

    return buildResponse(200, { url: session.url });
  } catch (err) {
    console.error('Failed to create subscription session', err);
    return buildResponse(500, { error: 'Unable to start subscription' });
  }
};
