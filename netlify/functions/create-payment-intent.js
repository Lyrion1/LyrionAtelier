const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://lyrionatelier.com,https://www.lyrionatelier.com,http://localhost:8888,http://localhost:8000,http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim()).filter(Boolean);
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5.99;
const MINIMUM_AMOUNT_CENTS = 50;
const DEFAULT_ORIGIN = allowedOrigins[0] || '';

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe payments will fail.');
}

const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null;

const baseHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildHeaders(requestOrigin) {
  const allowOrigin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : DEFAULT_ORIGIN;
  return { ...baseHeaders, 'Access-Control-Allow-Origin': allowOrigin };
}

function calculateTotals(items = []) {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price ?? 0);
    const quantity = Number(item.quantity ?? 0);
    return sum + price * quantity;
  }, 0);
  const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : (items.length ? SHIPPING_COST : 0);
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function extractPaymentIntentId(clientSecret = '') {
  const secretParts = clientSecret.split('_secret');
  return secretParts.length > 1 ? secretParts[0] : null;
}

exports.handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin;
  const headers = buildHeaders(requestOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!stripe || !publishableKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Stripe is not configured.' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const rawItems = Array.isArray(payload.items) ? payload.items : [];
    const currency = payload.currency || 'usd';
    const customer = payload.customer || {};
    const clientSecret = payload.clientSecret;

    const items = rawItems.filter((item) => {
      const price = Number(item.price);
      const quantity = Number(item.quantity);
      return Number.isFinite(price) && price > 0 && Number.isFinite(quantity) && quantity > 0;
    });

    if (!items.length) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cart is empty.' }) };
    }

    const { total } = calculateTotals(items);
    const amount = Math.round(total * 100);
    if (!amount || amount < MINIMUM_AMOUNT_CENTS) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payment amount.' }),
      };
    }

    const paymentIntentId = clientSecret ? extractPaymentIntentId(clientSecret) : null;

    const intent = paymentIntentId
      ? await stripe.paymentIntents.update(paymentIntentId, {
          amount,
          currency,
          receipt_email: customer.email || undefined,
          metadata: {
            customer_name: customer.name || '',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
          },
        })
      : await stripe.paymentIntents.create({
          amount,
          currency,
          automatic_payment_methods: { enabled: true },
          receipt_email: customer.email || undefined,
          metadata: {
            customer_name: customer.name || '',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
          },
        });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: intent.client_secret,
        publishableKey,
      }),
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Unable to start payment.' }),
    };
  }
};
