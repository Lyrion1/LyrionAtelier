const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { productName, productPrice, variantId, productType } = JSON.parse(event.body);
    const metadata = {
      product_type: productType || 'oracle_reading',
      product_name: productName,
    };

    if (!productName || !productPrice) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    if (variantId) {
      metadata.variant_id = String(variantId);
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: `Lyrion Atelier - ${productName}`,
          },
          unit_amount: Math.round(parseFloat(productPrice) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${event.headers.origin || 'https://lyrionatelier.com'}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${event.headers.origin || 'https://lyrionatelier.com'}/oracle.html`,
      billing_address_collection: 'required',
      metadata,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    console.error('Checkout error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
