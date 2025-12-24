const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log('Stripe key exists?', !!process.env.STRIPE_SECRET_KEY);
console.log('Key starts with:', process.env.STRIPE_SECRET_KEY?.substring(0, 7));

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
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
