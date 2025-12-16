const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

  let parsedBody = {};
  try {
    parsedBody = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const referer = event.headers?.referer || '';
  const originFromReferer = (() => {
    try {
      return referer ? new URL(referer).origin : '';
    } catch {
      return '';
    }
  })();
  const origin = event.headers?.origin || originFromReferer || process.env.URL || '';
  const successUrl = parsedBody.successUrl || `${origin}/success.html`;
  const cancelUrl = parsedBody.cancelUrl || referer || `${origin}/cart.html`;
  const lineItemsInput = Array.isArray(parsedBody.lineItems) ? parsedBody.lineItems : null;
  const productType = parsedBody.productType || (lineItemsInput ? 'merchandise' : 'oracle_reading');
  const productName = parsedBody.productName;
  const productPrice = parsedBody.productPrice;
  const variantId = parsedBody.variantId;

  let lineItems = [];

  const validateLineItem = (item) => {
    const priceData = item?.price_data;
    const unitAmount = priceData?.unit_amount;
    const name = priceData?.product_data?.name;
    const quantity = Number(item?.quantity);
    return (
      priceData &&
      priceData.currency &&
      typeof unitAmount === 'number' &&
      unitAmount > 0 &&
      name &&
      typeof name === 'string' &&
      Number.isFinite(quantity) &&
      quantity > 0
    );
  };

  if (lineItemsInput && lineItemsInput.length) {
    if (lineItemsInput.some((item) => !validateLineItem(item))) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid line items' }) };
    }
    lineItems = lineItemsInput;
  } else if (productName && productPrice) {
    const unitAmount = Math.round(Number(productPrice) * 100);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid product price' }) };
    }
    lineItems = [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: productName },
          unit_amount: unitAmount
        },
        quantity: 1
      }
    ];
  } else {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }

  if (origin && (!successUrl.startsWith(origin) || !cancelUrl.startsWith(origin))) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid redirect URLs' }) };
  }

  const sessionConfig = {
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: true },
    metadata: { product_type: productType }
  };

  if (productType === 'merchandise') {
    sessionConfig.shipping_address_collection = {
      allowed_countries: ['US', 'CA', 'GB', 'AU']
    };
    if (variantId) {
      sessionConfig.metadata.variant_id = variantId.toString();
    }
  } else if (productType === 'compatibility_certificate') {
    sessionConfig.metadata.certificate_type = 'compatibility';
  } else if (productType === 'oracle_reading') {
    sessionConfig.metadata.reading_type = 'oracle';
  }

  try {
    const session = await stripe.checkout.sessions.create(sessionConfig);
    return { statusCode: 200, headers, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (err) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    return { statusCode, headers, body: JSON.stringify({ error: err.message }) };
  }
};
