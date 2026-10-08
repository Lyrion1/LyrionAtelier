// Owner approval for readings and certificates (JSON API behind /approve).
//
// The approval email links to lyrionatelier.com/approve?id=…&token=…, which
// shows the draft, editable, with one "Approve and send" button.
//   GET  ?id&token            -> the draft and its details
//   POST {id, token, text}    -> build the PDF and send it
// Opening the link never sends anything: mail scanners open links on their own.
import { corsHeaders, json } from '../_shared/env.ts';
import { db } from '../_shared/db.ts';
import { verify } from '../_shared/tokens.ts';
import { deliver } from '../_shared/fulfil.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  let id = url.searchParams.get('id') ?? '';
  let token = url.searchParams.get('token');
  let text = '';
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as { id?: string; token?: string; text?: string };
    id = String(body.id ?? '');
    token = String(body.token ?? '');
    text = String(body.text ?? '');
  } else if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  if (!id || !(await verify('approve', id, token))) return json({ error: 'This approval link is not valid.' }, 403);
  const { data: row } = await db().from('deliveries').select('*').eq('id', id).maybeSingle();
  if (!row) return json({ error: 'This order could not be found.' }, 404);

  const summary = {
    id: row.id,
    product: row.product_title,
    type: row.product_type,
    status: row.status,
    to: row.recipient_email || row.customer_email,
    due_at: row.due_at,
    delivered_at: row.delivered_at,
    gift_note: row.gift_note,
    details: row.details,
    draft: row.draft ?? '',
  };

  if (req.method === 'GET' || row.status === 'delivered') return json(summary);

  try {
    const { to } = await deliver(id, text);
    return json({ ...summary, status: 'delivered', to });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 400);
  }
});
