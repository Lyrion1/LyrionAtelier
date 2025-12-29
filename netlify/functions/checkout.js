const Stripe = require('stripe');
const { applyPromotions } = require('./lib/promotions');

const secretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error('Stripe live secret key is not configured.');
}

const stripe = new Stripe(secretKey);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = { 'Content-Type': 'application/json' };

  try {
    const body = JSON.parse(event.body || '{}');
    const origin = body.origin || process.env.URL || 'https://example.com';
    const cart = Array.isArray(body.items) ? body.items : [];

    const norm = cart
      .map((x) => ({
        title: String(x.title || 'Item'),
        sku: String(x.sku || ''),
        price: Number(x.price || 0),
        quantity: Number(x.quantity || 1),
        image: x.image ? String(x.image) : undefined
      }))
      .filter((i) => i.quantity > 0 && i.price >= 0);

    const { discounts, totalDiscount } = applyPromotions(norm);

    const subtotal = norm.reduce((s, i) => s + i.price * i.quantity, 0);
    const factor = subtotal > 0 ? Math.max(0, (subtotal - totalDiscount) / subtotal) : 1;

    const MIN_UNIT_AMOUNT = 50; // Stripe minimum charge ($0.50)
    const line_items = norm.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: Math.max(MIN_UNIT_AMOUNT, Math.round(i.price * factor)),
        product_data: {
          name: i.title,
          metadata: { sku: i.sku },
          images: i.image ? [i.image] : undefined
        }
      }
    }));

    const desc = discounts.length ? discounts.map((d) => d.label).join(' • ') : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      automatic_tax: { enabled: true },
      discounts: [],
      allow_promotion_codes: false,
      invoice_creation: { enabled: false },
      metadata: { promos: desc || '' },
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`
    });

    return { statusCode: 200, headers, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: err.message }) };
  }
};
