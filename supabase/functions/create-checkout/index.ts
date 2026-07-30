import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://lyrionatelier.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

interface BasketItem { id: string; qty: number; size?: string; }
interface Product {
  id: string;
  name: string;
  priceGBP: number | null;
  image: string;
  sizes?: string[];
  printfulVariantId?: string | string[];
}

let productCache: Product[] | null = null;

async function loadProducts(): Promise<Product[]> {
  if (productCache) return productCache;
  const candidates = [
    `${SITE_URL}/data/products.json`,
    `${SITE_URL}/public/data/products.json`,
  ];
  const tried: string[] = [];
  for (const url of candidates) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        productCache = await resp.json() as Product[];
        return productCache;
      }
      tried.push(`${url} -> ${resp.status}`);
    } catch (e) {
      tried.push(`${url} -> ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw new Error(`Could not load products.json. Tried: ${tried.join(' | ')}`);
}

function parseDiscountCode(code: string): { type: 'percent' | 'fixed' | null; value: number } {
  if (!code) return { type: null, value: 0 };
  const pctMatch = code.match(/[-_](\d+)$/);
  if (pctMatch) {
    const pct = parseInt(pctMatch[1], 10);
    if (pct > 0 && pct <= 100) return { type: 'percent', value: pct };
  }
  const fixedMatch = code.match(/FIXED[-_](\d+)/i);
  if (fixedMatch) return { type: 'fixed', value: parseInt(fixedMatch[1], 10) };
  return { type: null, value: 0 };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json() as { basket: BasketItem[]; discountCode?: string };
    const { basket, discountCode } = body;

    if (!Array.isArray(basket) || basket.length === 0) {
      return json({ error: 'Empty basket' }, 400);
    }

    const products = await loadProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    for (const item of basket) {
      const product = productMap.get(item.id);
      if (!product) return json({ error: `Unknown product: ${item.id}` }, 400);
      if (!product.priceGBP) return json({ error: `No price for product: ${item.id}` }, 400);

      const productName = item.size ? `${product.name} (${item.size})` : product.name;

      lineItems.push({
        quantity: item.qty,
        price_data: {
          currency: 'gbp',
          unit_amount: product.priceGBP,
          product_data: {
            name: productName,
            images: product.image?.startsWith('/')
              ? [`${SITE_URL}${product.image}`]
              : (product.image ? [product.image] : []),
          },
        },
      });
    }

    let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
    if (discountCode) {
      const { type, value } = parseDiscountCode(discountCode);
      if (type === 'percent' && value > 0) {
        const coupon = await stripe.coupons.create({
          percent_off: value, duration: 'once', name: discountCode,
        });
        discounts = [{ coupon: coupon.id }];
      } else if (type === 'fixed' && value > 0) {
        const coupon = await stripe.coupons.create({
          amount_off: value, currency: 'gbp', duration: 'once', name: discountCode,
        });
        discounts = [{ coupon: coupon.id }];
      }
    }

    const basketMeta = JSON.stringify(
      basket.map((item) => ({
        id: item.id,
        qty: item.qty,
        size: item.size ?? null,
        printfulVariantId: productMap.get(item.id)?.printfulVariantId ?? null,
      })),
    );

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      return_url: `${SITE_URL}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      shipping_address_collection: {
        allowed_countries: [
          'GB','IE','FR','DE','IT','ES','NL','BE','PT','SE','NO','DK','CH','AT',
          'PL','CZ','HU','RO','BG','HR','SK','SI','LT','LV','EE','FI','GR','CY',
          'MT','LU','US','CA','AU','NZ','JP',
        ],
      },
      ...(discounts ? { discounts } : {}),
      metadata: {
        basket: basketMeta.slice(0, 500),
        discountCode: discountCode ?? '',
      },
    });

    return json({ clientSecret: session.client_secret }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[create-checkout]', message);
    return json({ error: message }, 500);
  }
});
