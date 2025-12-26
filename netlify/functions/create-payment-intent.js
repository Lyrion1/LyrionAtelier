const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST;
const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY_TEST;
const printfulApiKey = process.env.PRINTFUL_API_KEY;
const fetch = require('node-fetch');
const DEFAULT_ALLOWED_ORIGINS = 'https://lyrionatelier.com,https://www.lyrionatelier.com,http://localhost:8888,http://localhost:8000,http://localhost:5173,http://localhost:3000';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS).split(',').map(o => o.trim()).filter(Boolean);
const allowedLocalhostPorts = (process.env.ALLOWED_LOCALHOST_PORTS || '8888,8000,5173,3000').split(',').map(p => p.trim()).filter(Boolean);
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST = 5.99;
const MINIMUM_AMOUNT_CENTS = 50;
const DEFAULT_ORIGIN = allowedOrigins[0] || 'https://lyrionatelier.com';
const SUPPORTED_CURRENCIES = ['usd'];
const STATIC_PRICE_MAP = {
  1: 34.99,
  2: 59.99,
  3: 44.99,
  4: 34.99,
  5: 59.99,
  6: 44.99,
  7: 34.99,
  8: 59.99,
  9: 44.99,
  10: 34.99,
  11: 59.99,
  12: 44.99,
  13: 32.99,
  14: 62.99,
  15: 47.99,
  16: 36.99,
  17: 64.99,
  18: 46.99,
  19: 35.99,
  20: 61.99,
  101: 65,
  102: 55,
  103: 52,
  104: 60,
  105: 70,
  106: 58,
  107: 50,
  108: 75,
};

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY_TEST is not set. Stripe payments will fail.');
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

async function fetchPrintfulVariantPrice(variantId) {
  if (!printfulApiKey || !variantId) return null;
  try {
    const response = await fetch(`https://api.printful.com/store/variants/${variantId}`, {
      headers: {
        Authorization: `Bearer ${printfulApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const price = Number(data?.result?.sync_variant?.retail_price);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch (error) {
    console.error(`Unable to fetch Printful price for variant ${variantId}`, error);
    return null;
  }
}

async function normalizeItems(rawItems = []) {
  const normalized = [];
  for (const raw of rawItems) {
    const quantity = Number(raw?.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const primaryId = raw?.id;
    const variantId = raw?.printfulVariantId || raw?.variantId || raw?.variant_id || primaryId;
    const numericId = Number(variantId);
    let price = null;
    let resolvedId = null;

    if (Number.isFinite(numericId) && STATIC_PRICE_MAP[numericId]) {
      price = STATIC_PRICE_MAP[numericId];
      resolvedId = numericId;
    } else if (Number.isFinite(numericId)) {
      price = await fetchPrintfulVariantPrice(numericId);
      resolvedId = numericId;
    }

    if (!price) continue;

    normalized.push({
      id: resolvedId,
      quantity,
      price,
    });
  }
  return normalized;
}

async function calculateTotals(items = []) {
  const validItems = await normalizeItems(items);
  const subtotal = validItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : (validItems.length ? SHIPPING_COST : 0);
  const total = subtotal + shipping;
  return { subtotal, shipping, total, itemCount: validItems.length };
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

    const { total, itemCount } = await calculateTotals(rawItems);

    if (!itemCount) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cart is empty or invalid.' }) };
    }
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
