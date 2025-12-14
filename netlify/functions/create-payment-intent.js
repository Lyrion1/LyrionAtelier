const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const allowOriginHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const calculateTotals = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity || 1);
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return sum;
    }
    return sum + price * quantity;
  }, 0);

  const shipping = subtotal > 50 ? 0 : (items.length ? 5.99 : 0);
  const total = subtotal + shipping;

  return { subtotal, shipping, total };
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: allowOriginHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: allowOriginHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
    return {
      statusCode: 500,
      headers: allowOriginHeaders,
      body: JSON.stringify({ error: 'Stripe keys are not configured' }),
    };
  }

  if (!stripe) {
    return {
      statusCode: 500,
      headers: allowOriginHeaders,
      body: JSON.stringify({ error: 'Stripe client not initialized' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const items = Array.isArray(payload.items) ? payload.items : [];
    const currency = (payload.currency || 'usd').toLowerCase();
    const customer = payload.customer || {};

    const { total } = calculateTotals(items);
    const amountInCents = Math.round(total * 100);

    if (!amountInCents || amountInCents < 50) {
      return {
        statusCode: 400,
        headers: allowOriginHeaders,
        body: JSON.stringify({ error: 'Invalid order total' }),
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      automatic_payment_methods: { enabled: true },
      receipt_email: customer.email,
      metadata: {
        customer_name: customer.name || '',
        customer_email: customer.email || '',
        order_note: customer.address || '',
        source: 'payment_element_checkout',
      },
      shipping: customer.address
        ? {
            name: customer.name || 'Customer',
            address: {
              line1: customer.address,
            },
            phone: customer.phone || undefined,
          }
        : undefined,
    });

    return {
      statusCode: 200,
      headers: {
        ...allowOriginHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      }),
    };
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    return {
      statusCode: 500,
      headers: allowOriginHeaders,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
