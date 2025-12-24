const secretKey = process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
const stripe = secretKey ? require('stripe')(secretKey) : null;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!stripe) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Stripe secret key missing. Set STRIPE_SECRET_KEY_TEST for test mode or STRIPE_SECRET_KEY for live.'
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
      success_url: `${process.env.URL || 'https://lyrionatelier.com'}/thank-you.html`,
      cancel_url: `${process.env.URL || 'https://lyrionatelier.com'}/test-checkout.html`,
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
