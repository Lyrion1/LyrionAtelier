const stripeSecretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;

exports.handler = async (event) => {
  if (!stripe) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Stripe secret key missing' })
    };
  }

  const { session_id } = event.queryStringParameters || {};

  if (!session_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing session_id' })
    };
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'customer']
    });

    return {
      statusCode: 200,
      body: JSON.stringify(session)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
