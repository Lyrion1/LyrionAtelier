// Creates an embedded Stripe Checkout session for the basket.
//
// Prices, variants and what may be sold all come from the site's own files:
// public/data/products.json (generated from data/catalogue.json) and
// data/house.json (the house engine). The client sends only what was chosen:
// product slug, variant, quantity, personal details for readings and
// certificates, a gift note, and the discount wheel's prize.
import Stripe from 'npm:stripe@14.25.0';
import { corsHeaders, json, requireEnv, SITE_URL } from '../_shared/env.ts';
import { loadShop, pickVariant, resting, type CheckoutProduct } from '../_shared/catalogue.ts';
import { cleanDetails, packDetails, type RawDetails } from '../_shared/details.ts';

const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Delivery for physical pieces, as the basket shows it (js/shipping-config.js):
// free from £50 of physical goods, £5.99 below that. Digital items never ship.
const SHIPPING_FREE_FROM_PENCE = 5000;
const SHIPPING_PENCE = 599;

const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  'GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'PT', 'SE', 'NO', 'DK', 'CH', 'AT',
  'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI', 'LT', 'LV', 'EE', 'FI', 'GR', 'CY',
  'MT', 'LU', 'US', 'CA', 'AU', 'NZ', 'JP',
];

interface BasketLine {
  id: string;
  qty?: number;
  quantity?: number;
  size?: string | null;
  color?: string | null;
  variant?: string | null;
  details?: RawDetails;
}

// The only prizes the discount wheel (js/spinning-wheel.js) can award, and the
// shape of the codes it issues. Anything else is ignored, so a hand-made
// request cannot invent a bigger discount than the wheel gives.
const WHEEL_CODE = /^COSMIC-[A-HJ-NP-Z2-9]{6}$/;
const WHEEL_PERCENT = new Set([10, 15, 20]);
const WHEEL_FIXED_GBP = new Set([5]);

interface Prize {
  type?: string;
  value?: number;
}

function wheelPrize(code: unknown, prize: unknown): { percent?: number; fixedPence?: number; freeShipping?: boolean; code: string } | null {
  if (typeof code !== 'string' || !WHEEL_CODE.test(code)) return null;
  const p = (prize && typeof prize === 'object' ? prize : {}) as Prize;
  const value = Number(p.value);
  if (p.type === 'discount' && WHEEL_PERCENT.has(value)) return { percent: value, code };
  if (p.type === 'fixed' && WHEEL_FIXED_GBP.has(value)) return { fixedPence: value * 100, code };
  if (p.type === 'shipping') return { freeShipping: true, code };
  return null;
}

function qtyOf(line: BasketLine): number {
  const n = Number(line.qty ?? line.quantity ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 20) : 1;
}

function absolute(url: string): string {
  return url.startsWith('/') ? `${SITE_URL}${encodeURI(url)}` : url;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json() as {
      basket?: BasketLine[];
      items?: BasketLine[];
      cart?: BasketLine[];
      discountCode?: string;
      discountPrize?: Prize;
      giftNote?: string;
      recipientEmail?: string;
    };
    const basket = body.basket ?? body.items ?? body.cart;
    if (!Array.isArray(basket) || basket.length === 0) return json({ error: 'Empty basket' }, 400);
    if (basket.length > 30) return json({ error: 'Too many lines in one basket.' }, 400);

    const { products, house } = await loadShop();
    const bySlug = new Map<string, CheckoutProduct>(products.map((p) => [p.id, p]));

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const metadata: Record<string, string> = {};
    const unavailable: { id: string; reason: string }[] = [];
    const needsDetails: string[] = [];
    let physicalPence = 0;

    for (const line of basket) {
      const product = bySlug.get(String(line.id || ''));
      if (!product) { unavailable.push({ id: String(line.id), reason: 'not-found' }); continue; }
      if (product.fulfilment === 'enquiry') { unavailable.push({ id: product.id, reason: 'by-enquiry' }); continue; }
      if (resting(product, house)) { unavailable.push({ id: product.id, reason: 'returns-with-the-season' }); continue; }
      const variant = pickVariant(product, line);
      if (!variant) { unavailable.push({ id: product.id, reason: 'variant-not-found' }); continue; }

      const index = lineItems.length;
      const productMeta: Record<string, string> = { slug: product.id, line: String(index), size: variant.size };
      if (variant.color) productMeta.color = variant.color;
      if (variant.printfulVariantId) productMeta.variant = variant.printfulVariantId;

      let quantity = qtyOf(line);
      if (product.personalisation) {
        const details = cleanDetails(product.personalisation, line.details);
        if (!details) { needsDetails.push(product.name); continue; }
        const packed = packDetails(details);
        if (packed.length > 500) { needsDetails.push(product.name); continue; }
        metadata[`d${index}`] = packed;
        quantity = 1; // one set of details, one piece
      }
      if (product.fulfilment === 'printful' || product.fulfilment === 'manual') physicalPence += variant.priceGBP * quantity;

      const label = [variant.size !== 'Standard' && variant.size !== 'One Size' ? variant.size : '', variant.color || ''].filter(Boolean).join(', ');
      lineItems.push({
        quantity,
        price_data: {
          currency: 'gbp',
          unit_amount: variant.priceGBP,
          product_data: {
            name: label ? `${product.name} (${label})` : product.name,
            ...(product.image ? { images: [absolute(product.image)] } : {}),
            metadata: productMeta,
          },
        },
      });
    }

    if (needsDetails.length) {
      return json({ error: `Please add the birth details for: ${needsDetails.join(', ')}.`, needsDetails }, 400);
    }
    if (!lineItems.length) {
      return json({ error: 'None of the items in your basket are available to purchase right now.', unavailable }, 400);
    }

    const prize = wheelPrize(body.discountCode, body.discountPrize);
    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (prize?.percent || prize?.fixedPence) {
      const coupon = await stripe.coupons.create({
        ...(prize.percent ? { percent_off: prize.percent } : { amount_off: prize.fixedPence, currency: 'gbp' }),
        duration: 'once',
        max_redemptions: 1,
        name: prize.code,
      });
      discounts = [{ coupon: coupon.id }];
      metadata.discount = prize.code;
    }

    const ships = physicalPence > 0;
    const freeShipping = !!prize?.freeShipping || physicalPence >= SHIPPING_FREE_FROM_PENCE;
    if (prize?.freeShipping) metadata.discount = prize.code;

    const giftNote = String(body.giftNote || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (giftNote) metadata.gift = giftNote;
    const recipient = String(body.recipientEmail || '').trim().toLowerCase();
    if (recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) && recipient.length <= 200) metadata.recipient = recipient;

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      mode: 'payment',
      line_items: lineItems,
      return_url: `${SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      ...(ships ? {
        shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
        shipping_options: [{
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name: freeShipping ? 'Free delivery' : 'Standard delivery',
            fixed_amount: { amount: freeShipping ? 0 : SHIPPING_PENCE, currency: 'gbp' },
          },
        }],
      } : {}),
      ...(discounts ? { discounts } : {}),
      payment_intent_data: { metadata: { source: 'lyrionatelier.com' } },
      metadata,
    });

    return json({ clientSecret: session.client_secret, ...(unavailable.length ? { unavailable } : {}) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[create-checkout]', message);
    return json({ error: 'Checkout could not start. Please try again in a moment.' }, 500);
  }
});
