const Stripe = require('stripe');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const printfulApiKey = process.env.PRINTFUL_API_KEY;
// Netlify functions run on Node 18+, which provides a global fetch implementation.
const fetchApi =
  typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : null;

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

const buildPrintfulOrder = (session, items) => {
  const customerDetails = session.customer_details || {};
  const address = customerDetails.address || {};

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
      currency: (session.currency || 'USD').toUpperCase(),
      subtotal: ((session.amount_subtotal || 0) / 100).toFixed(2),
      shipping: ((session.shipping_cost?.amount_total || 0) / 100).toFixed(2),
      tax: ((session.total_details?.amount_tax || 0) / 100).toFixed(2),
      total: ((session.amount_total || 0) / 100).toFixed(2),
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
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      getBody(event),
      signature,
      stripeWebhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return jsonResponse(400, `Webhook Error: ${err.message}`);
  }

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
      const variantId = typeof variantIdRaw === 'string' ? variantIdRaw.trim() : '';

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
    if (!fetchApi) {
      console.error('Fetch API unavailable in this runtime.');
      return jsonResponse(500, 'Server configuration error');
    }

    const response = await fetchApi('https://api.printful.com/orders', {
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
    const printfulCode = typeof data?.code === 'number' ? data.code : null;
    if (!response.ok || (printfulCode !== null && printfulCode !== 200)) {
      console.error('Printful order failed', { status: response.status, data });
      return jsonResponse(500, 'Failed to create Printful order');
    }

    const orderId = data?.result?.id || data?.result?.order?.id;
    console.log('Printful order created:', orderId || 'unknown');

    return jsonResponse(200, { received: true, printfulOrderId: orderId });
  } catch (error) {
    console.error('Printful order error:', error);
    return jsonResponse(500, 'Printful order error');
  }
};
