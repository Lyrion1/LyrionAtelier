const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const DEFAULT_ALLOWED_ORIGINS = 'https://lyrionatelier.com,https://www.lyrionatelier.com,http://localhost:8888,http://localhost:8000,http://localhost:5173,http://localhost:3000';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS).split(',').map(o => o.trim()).filter(Boolean);
const allowedLocalhostPorts = (process.env.ALLOWED_LOCALHOST_PORTS || '8888,8000,5173,3000').split(',').map(p => p.trim()).filter(Boolean);
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5.99;
const MINIMUM_AMOUNT_CENTS = 50;
const DEFAULT_ORIGIN = allowedOrigins[0] || 'https://lyrionatelier.com';
const SUPPORTED_CURRENCIES = ['usd'];

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
  const allowOrigin = isOriginAllowed(requestOrigin) ? requestOrigin : DEFAULT_ORIGIN;
  return { ...baseHeaders, 'Access-Control-Allow-Origin': allowOrigin };
}

function isOriginAllowed(origin) {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  if (origin.endsWith('.netlify.app')) return true;
  if (origin.startsWith('http://localhost:')) {
    const port = origin.split(':').pop();
    return allowedLocalhostPorts.includes(port);
  }
  return false;
}

function sanitizeItems(rawItems = []) {
  return rawItems.filter((item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity);
    return Number.isFinite(price) && price > 0 && Number.isFinite(quantity) && quantity > 0;
  });
}

function calculateTotals(items = []) {
  const validItems = sanitizeItems(items);
  const subtotal = validItems.reduce((sum, item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity);
    return sum + price * quantity;
  }, 0);
  const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : (validItems.length ? SHIPPING_COST : 0);
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
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
    const currency = SUPPORTED_CURRENCIES.includes((payload.currency || '').toLowerCase()) ? payload.currency.toLowerCase() : 'usd';
    const customer = payload.customer || {};

    const items = sanitizeItems(rawItems);

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

    const intent = await stripe.paymentIntents.create({
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
