import Stripe from 'https://esm.sh/stripe@14?target=deno';

const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const PRINTFUL_API_KEY = Deno.env.get('PRINTFUL_API_KEY');

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface BasketItem {
  id: string;
  qty: number;
  size: string | null;
  printfulVariantId: string | string[] | null;
}

interface PrintfulRecipient {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
}

async function createPrintfulOrder(
  recipient: PrintfulRecipient,
  items: BasketItem[],
  externalId: string,
): Promise<void> {
  if (!PRINTFUL_API_KEY) {
    console.error(
      '[stripe-webhook] FATAL: PRINTFUL_API_KEY secret is not set. Fulfilment cannot proceed.',
    );
    throw new Error('PRINTFUL_API_KEY is not configured');
  }

  const printfulItems = items.flatMap((item) => {
    const variants = Array.isArray(item.printfulVariantId)
      ? item.printfulVariantId
      : item.printfulVariantId
      ? [item.printfulVariantId]
      : [];

    if (variants.length === 0 || variants[0] === 'manual-fulfillment') {
      console.warn(
        `[stripe-webhook] Product ${item.id} uses manual fulfilment – skipping Printful line item`,
      );
      return [];
    }

    return [{ sync_variant_id: variants[0], quantity: item.qty }];
  });

  if (printfulItems.length === 0) {
    console.log(
      '[stripe-webhook] No Printful-eligible items in order – skipping Printful order creation',
    );
    return;
  }

  const body = { recipient, items: printfulItems, external_id: externalId };

  const authHeader = 'Bearer ' + PRINTFUL_API_KEY;
  const resp = await fetch('https://api.printful.com/orders', {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json() as {
    code?: number;
    result?: unknown;
    error?: { message?: string };
  };

  if (!resp.ok || (data.code && data.code >= 400)) {
    const msg = data.error?.message ?? JSON.stringify(data);
    console.error('[stripe-webhook] Printful API error:', msg);
    throw new Error('Printful order creation failed: ' + msg);
  }

  console.log('[stripe-webhook] Printful order created:', JSON.stringify(data.result ?? data));
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return new Response('Missing Stripe-Signature', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] Signature verification failed:', msg);
    return new Response('Webhook Error: ' + msg, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const basketRaw = session.metadata?.basket;
    if (!basketRaw) {
      console.error('[stripe-webhook] No basket metadata in session', session.id);
      return new Response('OK', { status: 200 });
    }

    let basket: BasketItem[];
    try {
      basket = JSON.parse(basketRaw) as BasketItem[];
    } catch {
      console.error('[stripe-webhook] Invalid basket JSON in metadata');
      return new Response('OK', { status: 200 });
    }

    const shipping = session.shipping_details;
    if (!shipping?.address) {
      console.error('[stripe-webhook] No shipping address on session', session.id);
      return new Response('OK', { status: 200 });
    }

    const recipient: PrintfulRecipient = {
      name: shipping.name ?? session.customer_details?.name ?? 'Customer',
      address1: shipping.address.line1 ?? '',
      address2: shipping.address.line2 ?? undefined,
      city: shipping.address.city ?? '',
      state_code: shipping.address.state ?? undefined,
      country_code: shipping.address.country ?? 'GB',
      zip: shipping.address.postal_code ?? '',
    };

    try {
      await createPrintfulOrder(recipient, basket, session.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[stripe-webhook] Printful order failed:', msg);
      // Return 200 to Stripe so it does not retry; error is logged for manual review
    }
  }

  return new Response('OK', { status: 200 });
});
