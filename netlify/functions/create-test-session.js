// netlify/functions/create-test-session.js
// Test checkout is disabled unless ENABLE_TEST_CHECKOUT === 'true'
const ENABLED = process.env.ENABLE_TEST_CHECKOUT === 'true';

// Prefer test key for the test endpoint; fall back to live if not set
const stripe = require('stripe')(
process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY
);

exports.handler = async (event) => {
  if (!ENABLED) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Test checkout disabled (production mode).' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { origin } = JSON.parse(event.body || '{}');

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      automatic_tax: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Test Item' },
            unit_amount: 100 // $1.00
          },
          quantity: 1
        }
      ],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    };
  }
};
