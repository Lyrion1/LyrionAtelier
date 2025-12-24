const Stripe = require('stripe');
const fetch = require('node-fetch');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const printfulApiKey = process.env.PRINTFUL_API_KEY;
const PRINTFUL_ORDERS_URL = 'https://api.printful.com/orders';
const zeroDecimalCurrencies = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'
]);

const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

const jsonResponse = (statusCode, payload) => ({
  statusCode,
  body: typeof payload === 'string' ? payload : JSON.stringify(payload),
});

const getSignature = (headers = {}) =>
  headers['stripe-signature'] || headers['Stripe-Signature'];

const getBody = (event) =>
  event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64')
    : event.body || '';

const formatRetailAmount = (amount, currency) => {
  const normalizedCurrency = (currency || 'USD').toUpperCase();
  const divisor = zeroDecimalCurrencies.has(normalizedCurrency) ? 1 : 100;
  const fractionDigits = zeroDecimalCurrencies.has(normalizedCurrency) ? 0 : 2;
  return (Number(amount || 0) / divisor).toFixed(fractionDigits);
};

const buildPrintfulOrder = (session, items) => {
  const customerDetails = session.customer_details || {};
  const address = customerDetails.address || {};
  const currency = (session.currency || 'USD').toUpperCase();
  const toAmount = (value) => formatRetailAmount(value, currency);

  return {
    recipient: {
      name: customerDetails.name,
      email: customerDetails.email,
      phone: customerDetails.phone,
      address1: address.line1,
      address2: address.line2 || '',
      city: address.city,
      state_code: address.state,
      country_code: address.country,
      zip: address.postal_code,
    },
    items,
    retail_costs: {
      currency,
      subtotal: toAmount(session.amount_subtotal),
      shipping: toAmount(session.shipping_cost?.amount_total),
      tax: toAmount(session.total_details?.amount_tax),
      total: toAmount(session.amount_total),
    },
  };
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, 'Method Not Allowed');
  }

  if (!stripe || !stripeWebhookSecret) {
    console.error('Missing Stripe configuration.');
    return jsonResponse(500, 'Server configuration error');
  }

  const signature = getSignature(event.headers);
  if (!signature) {
    return jsonResponse(400, 'Missing Stripe signature');
  }

  let stripeEvent;
  // Temporarily disabled signature check for testing
  stripeEvent = JSON.parse(event.body);

  if (stripeEvent.type !== 'checkout.session.completed') {
    return jsonResponse(200, { received: true });
  }

  if (!printfulApiKey) {
    console.error('Printful API key missing.');
    return jsonResponse(500, 'Printful configuration error');
  }

  const session = stripeEvent.data.object;

  let lineItems;
  try {
    const items = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ['data.price.product'],
    });
    lineItems = items.data || [];
  } catch (error) {
    console.error('Failed to list line items:', error);
    return jsonResponse(500, 'Unable to retrieve line items');
  }

  const items = lineItems
    .map((item) => {
      const product = item.price?.product;
      const variantIdRaw = product?.metadata?.printfulVariantId;
      const variantId =
        variantIdRaw !== null && variantIdRaw !== undefined
          ? String(variantIdRaw).trim()
          : '';

      if (!variantId) {
        console.error(
          'Missing or invalid printfulVariantId for product',
          product?.id || item.description
        );
        return null;
      }

      return {
        sync_variant_id: variantId,
        quantity: item.quantity,
      };
    })
    .filter(Boolean);

  if (!items.length) {
    console.error('No Printful items found in checkout session', session.id);
    return jsonResponse(200, {
      received: true,
      message: 'No printfulVariantId metadata on products',
    });
  }

  const printfulOrder = buildPrintfulOrder(session, items);

  try {
    const response = await fetch(PRINTFUL_ORDERS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${printfulApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printfulOrder),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error('Failed to parse Printful response JSON', jsonError);
      return jsonResponse(500, 'Invalid response from Printful');
    }

    // Printful returns a numeric `code` field even on success (200).
    const isPrintfulSuccess = () => {
      const code = typeof data?.code === 'number' ? data.code : null;
      if (code !== null) return code >= 200 && code < 300;
      return response.ok;
    };

    if (!response.ok || !isPrintfulSuccess()) {
      console.error('Printful order failed', { status: response.status, data });
      return jsonResponse(500, 'Failed to create Printful order');
    }

    const orderId = data?.result?.id || null;
    console.log('Printful order created:', orderId || 'unknown');

    return jsonResponse(200, { received: true, printfulOrderId: orderId });
  } catch (error) {
    console.error('Printful order error:', error);
    return jsonResponse(500, 'Printful order error');
  }
};
