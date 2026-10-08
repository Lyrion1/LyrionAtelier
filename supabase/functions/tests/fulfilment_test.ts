// Fulfilment tests against a stand-in Printful API.
//   cd supabase/functions && deno test --allow-net --allow-env --allow-read tests/
import { assert, assertEquals } from 'jsr:@std/assert@1';

const calls: { method: string; path: string; body: any }[] = [];
let failNextPosts = 0;
let existing: Record<string, any> = {};
const server = Deno.serve({ port: 0, onListen() {} }, async (req) => {
  const url = new URL(req.url);
  const body = req.method === 'POST' ? await req.json().catch(() => null) : null;
  calls.push({ method: req.method, path: url.pathname + url.search, body });
  if (req.method === 'GET' && url.pathname.startsWith('/orders/@')) {
    const id = decodeURIComponent(url.pathname.slice('/orders/@'.length));
    return existing[id] ? Response.json({ code: 200, result: existing[id] }) : Response.json({ code: 404, error: { message: 'Not found' } }, { status: 404 });
  }
  if (req.method === 'POST' && url.pathname === '/orders') {
    if (failNextPosts > 0) { failNextPosts -= 1; return Response.json({ code: 500, error: { message: 'Temporary error' } }, { status: 500 }); }
    const order = { id: 9001, status: 'pending', external_id: body.external_id };
    existing[body.external_id] = order;
    return Response.json({ code: 200, result: order });
  }
  return Response.json({ code: 404 }, { status: 404 });
});
Deno.env.set('PRINTFUL_API_BASE', `http://127.0.0.1:${server.addr.port}`);
Deno.env.set('PRINTFUL_API_KEY', 'test-key');

const { createConfirmedOrder, orderLine, giftBlock } = await import('../_shared/printful.ts');
const { cleanDetails, packDetails, unpackDetails } = await import('../_shared/details.ts');
const { pickVariant } = await import('../_shared/catalogue.ts');

const input = {
  externalId: 'pi_3TestPaymentIntent0001',
  recipient: { name: 'Ada Lovelace', address1: '1 Test Street', city: 'Milton Keynes', country_code: 'GB', zip: 'MK9 2PG', email: 'ada@example.com' },
  items: [orderLine('694b0b7b427766', 1), orderLine('694b0b7b4278a6', 2)],
  giftNote: '  Happy   birthday,\n with love  ',
};

Deno.test('a paid order becomes a confirmed Printful order with the chosen variants, address and gift note', async () => {
  calls.length = 0; existing = {}; failNextPosts = 0;
  const order = await createConfirmedOrder(input);
  assertEquals(order.id, 9001);
  const post = calls.find((c) => c.method === 'POST')!;
  assertEquals(post.path, '/orders?confirm=true');
  assertEquals(post.body.external_id, 'pi_3TestPaymentIntent0001');
  assertEquals(post.body.items, [{ external_variant_id: '694b0b7b427766', quantity: 1 }, { external_variant_id: '694b0b7b4278a6', quantity: 2 }]);
  assertEquals(post.body.recipient.zip, 'MK9 2PG');
  assertEquals(post.body.gift, { subject: 'A gift for you', message: 'Happy birthday, with love' });
});

Deno.test('a temporary Printful failure is retried', async () => {
  calls.length = 0; existing = {}; failNextPosts = 2;
  const order = await createConfirmedOrder(input, 3);
  assertEquals(order.id, 9001);
  assertEquals(calls.filter((c) => c.method === 'POST').length, 3);
});

Deno.test('a redelivered webhook never creates a second order', async () => {
  calls.length = 0; failNextPosts = 0;
  existing = { [input.externalId]: { id: 9001, status: 'pending' } };
  const order = await createConfirmedOrder(input);
  assertEquals(order.id, 9001);
  assertEquals(calls.filter((c) => c.method === 'POST').length, 0);
});

Deno.test('numeric ids address the sync variant directly; gift notes are capped at 200 characters', () => {
  assertEquals(orderLine('4012345678', 1), { sync_variant_id: 4012345678, quantity: 1 });
  assertEquals(giftBlock('x'.repeat(300))!.message.length, 200);
  assertEquals(giftBlock('   '), undefined);
});

Deno.test('birth details are validated, survive Stripe metadata and stay under 500 characters', () => {
  const couple = cleanDetails('couple', { people: [{ name: 'Elowen Hart', date: '1993-06-14', time: '07:30', place: 'Falmouth' }, { name: 'Tobias Vale', date: '1991-10-02' }] })!;
  const packed = packDetails(couple);
  assert(packed.length < 500);
  assertEquals(unpackDetails(packed), couple);
  assertEquals(cleanDetails('couple', { people: [{ name: 'Only one', date: '1993-06-14' }] }), null);
  assertEquals(cleanDetails('person', { people: [{ name: 'Future', date: '2999-01-01' }] }), null);
  assertEquals(cleanDetails('pet', { people: [{ name: 'Biscuit', date: '2024-08-21' }] }), null, 'pets need a species');
});

Deno.test('the basket line picks the exact variant, never the first one', () => {
  const product = { id: 'leo-zodiac-hoodie', name: 'Leo', type: 'apparel', fulfilment: 'printful', sign: 'Leo', seasonal: true, priceGBP: 4699, image: '',
    variants: [{ size: 'S', priceGBP: 4699, printfulVariantId: 'a1' }, { size: '3XL', priceGBP: 5099, printfulVariantId: 'a6' }] } as const;
  assertEquals(pickVariant(product as any, { variant: 'a6' })!.priceGBP, 5099);
  assertEquals(pickVariant(product as any, { size: '3XL' })!.printfulVariantId, 'a6');
  assertEquals(pickVariant(product as any, { size: 'Default' }), null, 'an ambiguous line is refused, not guessed');
});

addEventListener('unload', () => server.shutdown());
