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

  const { lineItems, successUrl, cancelUrl } = parsedBody;
  const origin = event.headers?.origin || event.headers?.referer || '';
  if (!Array.isArray(lineItems) || !lineItems.length || !successUrl || !cancelUrl) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
  }
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
  const invalidLineItem = lineItems.some((item) => !validateLineItem(item));
  if (invalidLineItem) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid line items' }) };

  if (origin && (!successUrl.startsWith(origin) || !cancelUrl.startsWith(origin))) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid redirect URLs' }) };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      automatic_tax: { enabled: true }
    });
    return { statusCode: 200, headers, body: JSON.stringify({ id: session.id, url: session.url }) };
  } catch (err) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 500;
    return { statusCode, headers, body: JSON.stringify({ error: err.message }) };
  }
};
