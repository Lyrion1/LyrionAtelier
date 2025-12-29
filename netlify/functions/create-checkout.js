const Stripe = require('stripe');
const stripeSecretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!stripe) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Stripe secret key missing. Set STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY) for live mode.'
      })
    };
  }

  try {
    const { priceId, quantity } = JSON.parse(event.body);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: quantity,
      }],
      mode: 'payment',
      success_url: `${process.env.URL || 'https://lyrionatelier.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.URL || 'https://lyrionatelier.com'}/cart`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
