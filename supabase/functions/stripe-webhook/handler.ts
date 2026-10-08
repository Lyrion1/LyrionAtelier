// Stripe webhook: turns a paid checkout into fulfilment.
//
//   physical pieces   -> a confirmed Printful order (right variants, address
//                        and gift note), retried on failure, owner emailed
//   readings and      -> a delivery record, a draft written from the birth
//   certificates         details, and an approval email to the owner
//
// Stripe redelivers on any non-2xx response, and every step here is
// idempotent, so a redelivery finishes whatever did not finish before.
import Stripe from 'npm:stripe@14.25.0';
import { OWNER_EMAIL, requireEnv } from '../_shared/env.ts';
import { db } from '../_shared/db.ts';
import { sendMail } from '../_shared/mail.ts';
import { loadShop } from '../_shared/catalogue.ts';
import { unpackDetails } from '../_shared/details.ts';
import { acknowledgeDigital, fulfilPrintful, generateDelivery, type PrintfulPayload } from '../_shared/fulfil.ts';
import { orderLine } from '../_shared/printful.ts';

// STRIPE_API_BASE points the client at a stand-in Stripe in the tests only.
const apiBase = Deno.env.get('STRIPE_API_BASE') ? new URL(Deno.env.get('STRIPE_API_BASE')!) : null;
const stripe = new Stripe(requireEnv('STRIPE_SECRET_KEY'), {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
  ...(apiBase ? { host: apiBase.hostname, port: Number(apiBase.port), protocol: apiBase.protocol.replace(':', '') as 'http' | 'https' } : {}),
});

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

function background(p: Promise<unknown>) {
  const guarded = p.catch((e) => console.error('[stripe-webhook] background task failed', e));
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(guarded);
}

async function handlePaidSession(sessionId: string): Promise<boolean> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== 'paid') return true;

  const { data: existing } = await db().from('orders').select('*').eq('stripe_session_id', session.id).maybeSingle();
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100, expand: ['data.price.product'] });
  const { products } = await loadShop();
  const bySlug = new Map(products.map((p) => [p.id, p]));

  const printfulItems: PrintfulPayload['items'] = [];
  const manual: string[] = [];
  const digital: { line: number; slug: string; title: string; type: 'reading' | 'certificate' }[] = [];

  for (const item of lineItems.data) {
    const product = item.price?.product as Stripe.Product | undefined;
    const meta = product?.metadata ?? {};
    const entry = bySlug.get(meta.slug);
    if (!entry) {
      manual.push(`${item.quantity} x ${item.description} (not in the catalogue)`);
      continue;
    }
    if (entry.fulfilment === 'printful' && meta.variant) {
      printfulItems.push(orderLine(meta.variant, item.quantity ?? 1));
    } else if (entry.fulfilment === 'digital' && (entry.type === 'reading' || entry.type === 'certificate')) {
      digital.push({ line: Number(meta.line), slug: entry.id, title: entry.name, type: entry.type });
    } else {
      manual.push(`${item.quantity} x ${item.description}`);
    }
  }

  const customerEmail = session.customer_details?.email ?? '';
  const giftNote = session.metadata?.gift || undefined;
  const shipping = session.shipping_details;
  const payload: PrintfulPayload | null = printfulItems.length && shipping?.address
    ? {
      // Printful external ids are short; the payment intent id is unique per payment.
      externalId: (typeof session.payment_intent === 'string' ? session.payment_intent : session.id).slice(0, 32),
      recipient: {
        name: shipping.name ?? session.customer_details?.name ?? 'Customer',
        address1: shipping.address.line1 ?? '',
        ...(shipping.address.line2 ? { address2: shipping.address.line2 } : {}),
        city: shipping.address.city ?? '',
        ...(shipping.address.state ? { state_code: shipping.address.state } : {}),
        country_code: shipping.address.country ?? 'GB',
        zip: shipping.address.postal_code ?? '',
        ...(customerEmail ? { email: customerEmail } : {}),
      },
      items: printfulItems,
      ...(giftNote ? { giftNote } : {}),
    }
    : null;

  let orderId = existing?.id as string | undefined;
  if (!orderId) {
    const { data, error } = await db().from('orders').insert({
      stripe_session_id: session.id,
      payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      customer_email: customerEmail,
      gift_note: giftNote ?? null,
      printful_status: payload ? 'pending' : 'none',
      printful_payload: payload,
    }).select('id').single();
    if (error) {
      // A concurrent delivery of the same event inserted it first.
      const { data: again } = await db().from('orders').select('id').eq('stripe_session_id', session.id).single();
      orderId = again?.id;
    } else {
      orderId = data.id;
    }
    if (manual.length) {
      await sendMail({
        to: OWNER_EMAIL,
        subject: `Order needs fulfilling by hand: ${session.id}`,
        text: `These lines are not sent to Printful automatically:\n\n${manual.join('\n')}\n\nCustomer: ${customerEmail}`,
      }).catch((e) => console.error('[stripe-webhook] manual alert failed', e));
    }
    if (printfulItems.length && !payload) {
      await sendMail({
        to: OWNER_EMAIL,
        subject: `Paid order has no delivery address: ${session.id}`,
        text: `Printful items were paid for but Stripe returned no shipping address. Please contact ${customerEmail}.`,
      }).catch((e) => console.error('[stripe-webhook] address alert failed', e));
    }
  }
  if (!orderId) throw new Error('Could not record the order');

  // Readings and certificates: one delivery per line, then write in the background.
  if (digital.length && customerEmail) {
    const rows = digital.map((d) => ({
      order_id: orderId,
      stripe_session_id: session.id,
      line: d.line,
      product_slug: d.slug,
      product_title: d.title,
      product_type: d.type,
      details: unpackDetails(session.metadata?.[`d${d.line}`]),
      customer_email: customerEmail,
      recipient_email: session.metadata?.recipient || null,
      gift_note: giftNote ?? null,
    })).filter((r) => r.details);
    const { data: inserted } = await db().from('deliveries')
      .upsert(rows, { onConflict: 'stripe_session_id,line', ignoreDuplicates: true })
      .select('id');
    if (inserted?.length) {
      background(acknowledgeDigital(customerEmail, digital.map((d) => d.title)));
      for (const row of inserted) background(generateDelivery(row.id));
    }
  }

  // Physical pieces: a confirmed Printful order.
  if (payload) return await fulfilPrintful(orderId);
  return true;
}

export async function handleWebhook(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('Missing Stripe-Signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), sig, requireEnv('STRIPE_WEBHOOK_SECRET'));
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err instanceof Error ? err.message : err);
    return new Response('Bad signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      const ok = await handlePaidSession(session.id);
      // A non-2xx makes Stripe redeliver; house-cron retries as well.
      if (!ok) return new Response('Printful not yet accepted; will retry', { status: 500 });
    } catch (err) {
      console.error('[stripe-webhook]', err instanceof Error ? err.message : err);
      return new Response('Fulfilment error; will retry', { status: 500 });
    }
  }
  return new Response('OK', { status: 200 });
}
