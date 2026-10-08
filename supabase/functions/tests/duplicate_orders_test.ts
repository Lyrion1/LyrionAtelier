// One payment can only ever create one Printful order.
//
// The real webhook handler runs against a real Postgres with the real
// migrations (tests/with-postgres.sh), behind a small stand-in for Supabase's
// REST layer that runs each request as SQL. Stripe, Printful and the site are
// stand-ins. The stand-in Printful accepts duplicate external ids on purpose,
// so the only thing preventing a second order is this code and the database.
//
//   cd supabase/functions
//   tests/with-postgres.sh deno test --allow-all tests/duplicate_orders_test.ts
import { assertEquals } from 'jsr:@std/assert@1';
import { createHmac } from 'node:crypto';

const DB_URL = Deno.env.get('TEST_DATABASE_URL');
const REPO = new URL('../../../', import.meta.url);

// ---- Postgres through psql -------------------------------------------------

async function sql(query: string): Promise<string> {
  const out = await new Deno.Command('psql', {
    args: [DB_URL!, '-X', '-A', '-t', '-q', '-v', 'ON_ERROR_STOP=1', '-c', query],
    stdout: 'piped',
    stderr: 'piped',
  }).output();
  if (!out.success) throw new Error(new TextDecoder().decode(out.stderr));
  return new TextDecoder().decode(out.stdout).trim();
}
const lit = (v: unknown) => `$lit$${String(v)}$lit$`;
const ident = (v: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(v)) throw new Error(`bad identifier ${v}`);
  return v;
};

// ---- Stand-in for Supabase's REST layer (PostgREST) ------------------------
// Supports what the webhook and fulfilment code use: select with eq / is
// filters, insert, update, and rpc, with PostgREST's single-object responses.

function where(params: URLSearchParams): string {
  const parts: string[] = [];
  for (const [key, value] of params) {
    if (['select', 'on_conflict', 'columns', 'limit'].includes(key)) continue;
    const [op, ...rest] = value.split('.');
    const v = rest.join('.');
    if (op === 'eq') parts.push(`${ident(key)} = ${lit(v)}`);
    else if (op === 'is' && v === 'null') parts.push(`${ident(key)} is null`);
    else throw new Error(`filter ${key}=${value} is not supported by the stand-in`);
  }
  return parts.length ? `where ${parts.join(' and ')}` : '';
}

function respond(req: Request, rows: unknown[], status = 200): Response {
  if ((req.headers.get('accept') || '').includes('vnd.pgrst.object')) {
    if (rows.length !== 1) {
      return Response.json({ code: 'PGRST116', message: `${rows.length} rows` }, { status: 406 });
    }
    return Response.json(rows[0], { status });
  }
  return Response.json(rows, { status });
}

async function rest(req: Request, path: string, params: URLSearchParams): Promise<Response> {
  if (path.startsWith('rpc/')) {
    const args = Object.entries(await req.json()).map(([k, v]) => `${ident(k)} => ${lit(v)}`).join(', ');
    return Response.json(JSON.parse(await sql(`select to_json(public.${ident(path.slice(4))}(${args}))`)));
  }
  const table = `public.${ident(path)}`;
  const cols = (params.get('select') || '*').split(',').map((c) => (c === '*' ? '*' : ident(c))).join(', ');
  const wantRows = req.method === 'GET' || (req.headers.get('prefer') || '').includes('return=representation');
  const asJson = (inner: string) => `with r as (${inner}) select coalesce(json_agg(r), '[]') from r`;
  try {
    if (req.method === 'GET') {
      return respond(req, JSON.parse(await sql(asJson(`select ${cols} from ${table} ${where(params)}`))));
    }
    if (req.method === 'POST') {
      const body = await req.json();
      const rows = Array.isArray(body) ? body : [body];
      const keys = Object.keys(rows[0]).map(ident).join(', ');
      const conflict = params.get('on_conflict');
      const ignore = (req.headers.get('prefer') || '').includes('ignore-duplicates') && conflict
        ? ` on conflict (${conflict.split(',').map(ident).join(', ')}) do nothing`
        : '';
      const result = JSON.parse(await sql(asJson(
        `insert into ${table} (${keys}) select ${keys} from json_populate_recordset(null::${table}, ${lit(JSON.stringify(rows))})${ignore} returning ${cols}`,
      )));
      return wantRows ? respond(req, result, 201) : new Response(null, { status: 201 });
    }
    if (req.method === 'PATCH') {
      const body = await req.json();
      const set = Object.keys(body).map((k) => `${ident(k)} = j.${ident(k)}`).join(', ');
      const result = JSON.parse(await sql(asJson(
        `update ${table} t set ${set} from json_populate_record(null::${table}, ${lit(JSON.stringify(body))}) j ${where(params).replace(/^where /, 'where t.').replaceAll(' and ', ' and t.')} returning t.*`,
      )));
      return wantRows ? respond(req, result) : new Response(null, { status: 204 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = /duplicate key/.test(message) ? '23505' : 'XX000';
    return Response.json({ code, message }, { status: code === '23505' ? 409 : 400 });
  }
  return Response.json({ message: 'unsupported' }, { status: 400 });
}

// ---- Stand-in Stripe, Printful and site ------------------------------------

const SESSION_ID = 'cs_test_duplicate_proof_0001';
const PAYMENT_INTENT = 'pi_3DuplicateProof000000001';
const MUG_VARIANT = '694b0b7b427766';

const printfulPosts: { external_id: string }[] = [];
const printfulOrders = new Map<string, { id: number; status: string }>();
let printfulDelayMs = 0;
let printfulDieAfterAccepting = false;
let nextPrintfulId = 1000;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const server = Deno.serve({ port: 0, onListen() {} }, async (req) => {
  const url = new URL(req.url);
  const path = url.pathname;

  if (path.startsWith('/rest/v1/')) return rest(req, path.slice('/rest/v1/'.length), url.searchParams);

  if (path === `/v1/checkout/sessions/${SESSION_ID}`) {
    return Response.json({
      id: SESSION_ID,
      object: 'checkout.session',
      payment_status: 'paid',
      payment_intent: PAYMENT_INTENT,
      customer_details: { email: 'buyer@lyrionatelier.test', name: 'Test Buyer' },
      shipping_details: {
        name: 'Test Buyer',
        address: { line1: 'Flat 9 Centro', line2: '399 South Row', city: 'Milton Keynes', state: null, country: 'GB', postal_code: 'MK9 2PG' },
      },
      metadata: {},
    });
  }
  if (path === `/v1/checkout/sessions/${SESSION_ID}/line_items`) {
    return Response.json({
      object: 'list',
      has_more: false,
      data: [{
        object: 'item',
        quantity: 1,
        description: 'Single Cosmic Design Mug',
        price: { product: { metadata: { slug: 'single-cosmic-design-mug', variant: MUG_VARIANT, line: '0' } } },
      }],
    });
  }

  if (path.startsWith('/printful/orders/@')) {
    await pause(printfulDelayMs);
    const order = printfulOrders.get(decodeURIComponent(path.slice('/printful/orders/@'.length)));
    return order
      ? Response.json({ code: 200, result: order })
      : Response.json({ code: 404, error: { message: 'Not found' } }, { status: 404 });
  }
  if (req.method === 'POST' && path === '/printful/orders') {
    const body = await req.json();
    await pause(printfulDelayMs);
    printfulPosts.push(body);
    // Like the real API, a new order is stored under its external id, but
    // nothing here refuses a second order with the same id.
    const order = { id: nextPrintfulId++, status: 'pending' };
    printfulOrders.set(body.external_id, order);
    if (printfulDieAfterAccepting) return new Response('connection lost', { status: 502 });
    return Response.json({ code: 200, result: order });
  }

  if (path.startsWith('/site/')) {
    try {
      return new Response(await Deno.readFile(new URL(path.slice('/site/'.length), REPO)), { headers: { 'content-type': 'application/json' } });
    } catch {
      return new Response('not found', { status: 404 });
    }
  }
  return new Response('not found', { status: 404 });
});
const BASE = `http://127.0.0.1:${server.addr.port}`;

Deno.env.set('SUPABASE_URL', BASE);
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'service-role-for-tests');
Deno.env.set('STRIPE_SECRET_KEY', 'sk_test_for_tests');
Deno.env.set('STRIPE_WEBHOOK_SECRET', 'whsec_for_tests');
Deno.env.set('STRIPE_API_BASE', BASE);
Deno.env.set('PRINTFUL_API_BASE', `${BASE}/printful`);
Deno.env.set('PRINTFUL_API_KEY', 'printful-for-tests');
Deno.env.set('SITE_URL', `${BASE}/site`);

const { handleWebhook } = await import('../stripe-webhook/handler.ts');
const { fulfilPrintful } = await import('../_shared/fulfil.ts');

// Signed exactly as Stripe signs: t=<time>,v1=HMAC-SHA256(secret, "<time>.<body>").
function delivery(type = 'checkout.session.completed', id = 'evt_test_1'): Request {
  const payload = JSON.stringify({ id, object: 'event', type, data: { object: { id: SESSION_ID, object: 'checkout.session' } } });
  const t = Math.floor(Date.now() / 1000);
  const header = `t=${t},v1=${createHmac('sha256', 'whsec_for_tests').update(`${t}.${payload}`).digest('hex')}`;
  return new Request('http://webhook/', { method: 'POST', headers: { 'stripe-signature': header }, body: payload });
}

async function reset() {
  await sql('truncate public.deliveries, public.orders cascade');
  printfulPosts.length = 0;
  printfulOrders.clear();
  printfulDelayMs = 0;
  printfulDieAfterAccepting = false;
  nextPrintfulId = 1000;
}
async function ledger() {
  return JSON.parse(await sql(`select coalesce(json_agg(o), '[]') from (select stripe_session_id, payment_intent, printful_status, printful_order_id from public.orders) o`));
}

const opts = { ignore: !DB_URL, sanitizeOps: false, sanitizeResources: false };
if (!DB_URL) console.warn('TEST_DATABASE_URL is not set: run this file through tests/with-postgres.sh');

Deno.test({ name: 'the same webhook delivered three times in a row creates one Printful order', ...opts, fn: async () => {
  await reset();
  for (let i = 0; i < 3; i += 1) assertEquals((await handleWebhook(delivery())).status, 200);
  assertEquals(printfulPosts.length, 1);
  assertEquals(printfulPosts[0].external_id, PAYMENT_INTENT);
  assertEquals(await ledger(), [{ stripe_session_id: SESSION_ID, payment_intent: PAYMENT_INTENT, printful_status: 'created', printful_order_id: 1000 }]);
} });

Deno.test({ name: 'five deliveries of the same payment at the same moment create one Printful order', ...opts, fn: async () => {
  await reset();
  printfulDelayMs = 150; // keep the first sender busy while the others arrive
  const results = await Promise.all([
    handleWebhook(delivery('checkout.session.completed', 'evt_a')),
    handleWebhook(delivery('checkout.session.completed', 'evt_b')),
    handleWebhook(delivery('checkout.session.async_payment_succeeded', 'evt_c')),
    handleWebhook(delivery('checkout.session.completed', 'evt_d')),
    handleWebhook(delivery('checkout.session.completed', 'evt_e')),
  ]);
  assertEquals(results.map((r) => r.status), [200, 200, 200, 200, 200]);
  assertEquals(printfulPosts.length, 1);
  assertEquals((await ledger()).length, 1);
  assertEquals((await ledger())[0].printful_status, 'created');
} });

Deno.test({ name: 'the webhook and the retry sweep racing on the same order create one Printful order', ...opts, fn: async () => {
  await reset();
  printfulDelayMs = 150;
  const first = handleWebhook(delivery());
  await pause(60); // the order row exists and the webhook is mid-way through sending it
  const [{ id }] = JSON.parse(await sql(`select coalesce(json_agg(o), '[]') from (select id from public.orders) o`));
  await Promise.all([first, fulfilPrintful(id), fulfilPrintful(id)]);
  assertEquals(printfulPosts.length, 1);
} });

Deno.test({ name: 'a sender that dies after Printful accepted the order does not cause a second one', ...opts, fn: async () => {
  await reset();
  printfulDieAfterAccepting = true; // Printful keeps the order, but every reply is lost
  // The next attempt asks Printful for this payment's order, finds it, and stops.
  assertEquals((await handleWebhook(delivery())).status, 200);
  printfulDieAfterAccepting = false;
  assertEquals((await handleWebhook(delivery())).status, 200);
  assertEquals((await handleWebhook(delivery())).status, 200);
  assertEquals(printfulPosts.length, 1);
  assertEquals((await ledger())[0].printful_status, 'created');
  assertEquals((await ledger())[0].printful_order_id, 1000);
} });

Deno.test({ name: 'a claim left behind by a worker that stopped is taken over after ten minutes, without a second order', ...opts, fn: async () => {
  await reset();
  printfulDieAfterAccepting = true;
  await handleWebhook(delivery());
  printfulDieAfterAccepting = false;
  // Simulate a worker that claimed the row, reached Printful and then stopped.
  await sql(`update public.orders set printful_status = 'sending', printful_claimed_at = now() - interval '11 minutes'`);
  const [{ id }] = JSON.parse(await sql(`select coalesce(json_agg(o), '[]') from (select id from public.orders) o`));
  assertEquals(await fulfilPrintful(id), true);
  assertEquals(printfulPosts.length, 1);
  assertEquals((await ledger())[0].printful_status, 'created');
} });

Deno.test({ name: 'a fresh claim held by another worker is left alone', ...opts, fn: async () => {
  await reset();
  await handleWebhook(delivery());
  await sql(`update public.orders set printful_status = 'sending', printful_claimed_at = now(), printful_order_id = null`);
  printfulOrders.clear();
  const [{ id }] = JSON.parse(await sql(`select coalesce(json_agg(o), '[]') from (select id from public.orders) o`));
  const before = printfulPosts.length;
  assertEquals(await fulfilPrintful(id), true);
  assertEquals(printfulPosts.length, before, 'no request reaches Printful while another worker holds the order');
} });

Deno.test({ name: 'the database refuses a second ledger row for the same payment', ...opts, fn: async () => {
  await reset();
  await sql(`insert into public.orders (stripe_session_id, payment_intent) values ('cs_one', 'pi_same')`);
  let refused = false;
  try {
    await sql(`insert into public.orders (stripe_session_id, payment_intent) values ('cs_two', 'pi_same')`);
  } catch {
    refused = true;
  }
  assertEquals(refused, true);
} });

Deno.test({ name: 'stop the stand-in servers', ...opts, fn: async () => {
  await server.shutdown();
} });
