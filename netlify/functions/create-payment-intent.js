const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { SHIPPING_THRESHOLD, SHIPPING_COST, ALLOWED_ORIGINS } = require('../../js/shipping-config');

const MINIMUM_ORDER_AMOUNT_CENTS = 50;

const isAllowedOrigin = (origin = '') => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.netlify.app')) return true;
  if (origin.startsWith('http://localhost:')) return true;
  return false;
};

const buildCorsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

const calculateTotals = (items = []) => {
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity || 1);
    if (!Number.isFinite(price) || !Number.isFinite(quantity)) {
      return sum;
    }
    return sum + price * quantity;
  }, 0);

  const shipping = subtotal > SHIPPING_THRESHOLD ? 0 : (items.length ? SHIPPING_COST : 0);
  const total = subtotal + shipping;

  return { subtotal, shipping, total };
};

exports.handler = async (event) => {
  const originHeader = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const corsOrigin = isAllowedOrigin(originHeader)
    ? (originHeader || ALLOWED_ORIGINS[0])
    : ALLOWED_ORIGINS[0];
  const corsHeaders = buildCorsHeaders(corsOrigin);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (!isAllowedOrigin(originHeader) && originHeader) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Origin not allowed' }),
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Payment configuration error' }),
    };
  }

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Payment configuration error' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const items = Array.isArray(payload.items) ? payload.items : [];
    const currency = (payload.currency || 'usd').toLowerCase();
    const customer = payload.customer || {};

    const { total } = calculateTotals(items);
    const amountInCents = Math.round(total * 100);

    if (!amountInCents || amountInCents < MINIMUM_ORDER_AMOUNT_CENTS) {
      return {
        statusCode: 400,
        headers: corsHeaders,
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
        shipping_address: customer.address || '',
        source: 'payment_element_checkout',
      },
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        publishableKey,
      }),
    };
  } catch (error) {
    console.error('Error creating PaymentIntent:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unable to create payment. Please try again.' }),
    };
  }
};
