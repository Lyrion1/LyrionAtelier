// The Birthday Book: a customer keeps the names and birthdays of the people
// they buy for, and the house engine reminds them 21 days ahead.
//
//   POST {action:"add", email, name, consent:true, entries:[...]}   save, send the opt-in email
//   POST {action:"confirm", email, token}                           double opt-in
//   POST {action:"unsubscribe", email, token}                       stop every reminder
//   POST ?email&token  (List-Unsubscribe=One-Click)                 same, from the mail client
//   POST {action:"delete", email, token}                            erase the whole book
//   GET  ?action=reminders&days=21   x-house-key: HOUSE_ENGINE_KEY  what the engine should send
//
// Nothing is ever sent to the people in the book; reminders go only to the
// person who saved them, and only after they confirm by email.
import { corsHeaders, json, requireEnv, SITE_URL } from '../_shared/env.ts';
import { db } from '../_shared/db.ts';
import { sendMail } from '../_shared/mail.ts';
import { sign, verify } from '../_shared/tokens.ts';
import { houseCore } from '../_shared/catalogue.ts';

export const CONSENT_TEXT =
  'Save these birthdays in my Lyrīon Birthday Book and email me a reminder 21 days before each one. I can unsubscribe at any time.';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function links(email: string) {
  const e = encodeURIComponent(email);
  return {
    confirm: `${SITE_URL}/birthday-book?confirm=1&email=${e}&token=${encodeURIComponent(await sign('bb-confirm', email))}`,
    unsubscribe: `${SITE_URL}/birthday-book?unsubscribe=1&email=${e}&token=${encodeURIComponent(await sign('bb-unsubscribe', email))}`,
    oneClick: `${Deno.env.get('SUPABASE_URL')}/functions/v1/birthday-book?email=${e}&token=${encodeURIComponent(await sign('bb-unsubscribe', email))}`,
  };
}

/** The calendar date `days` from today in London, as month and day. */
function targetDate(days: number): { month: number; day: number; iso: string; leap: boolean } {
  const today = houseCore.todayISO();
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate(), iso: d.toISOString().slice(0, 10), leap: (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 };
}

async function add(body: Record<string, unknown>): Promise<Response> {
  const email = clean(body.email, 200).toLowerCase();
  const ownerName = clean(body.name, 60);
  if (!EMAIL.test(email)) return json({ error: 'Please enter a valid email address.' }, 400);
  if (body.consent !== true) return json({ error: 'Please tick the box to agree to birthday reminders.' }, 400);
  const raw = Array.isArray(body.entries) ? body.entries.slice(0, 20) : [];
  const rows = [];
  for (const e of raw as Record<string, unknown>[]) {
    const person = clean(e.name, 60);
    const month = Number(e.month);
    const day = Number(e.day);
    const year = e.year ? Number(e.year) : null;
    const probe = new Date(Date.UTC(2000, month - 1, day)); // 2000 is a leap year, so 29 February is allowed
    if (!person || !(month >= 1 && month <= 12) || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
      return json({ error: `Please check the name and birthday for "${person || 'an entry'}".` }, 400);
    }
    if (year !== null && !(year >= 1900 && year <= new Date().getUTCFullYear())) return json({ error: `Please check the year for ${person}.` }, 400);
    rows.push({
      owner_email: email,
      owner_name: ownerName || null,
      person_name: person,
      birth_month: month,
      birth_day: day,
      birth_year: year,
      relationship: clean(e.relationship, 40) || null,
      consent_text: CONSENT_TEXT,
      consent_at: new Date().toISOString(),
    });
  }
  if (!rows.length) return json({ error: 'Add at least one name and birthday.' }, 400);

  // Every new entry waits for the owner of the address to confirm by email,
  // even when their book already exists, so nobody can add to another's book.
  const { data: before } = await db().from('birthday_book').select('confirmed_at, created_at').eq('owner_email', email);
  const sentRecently = (before ?? []).some((r) => !r.confirmed_at && Date.now() - new Date(r.created_at).getTime() < 10 * 60_000);

  const { error } = await db().from('birthday_book').upsert(rows, { onConflict: 'owner_email,person_name,birth_month,birth_day' });
  if (error) return json({ error: 'The Birthday Book could not be saved just now. Please try again.' }, 500);

  if (!sentRecently) {
    const l = await links(email);
    await sendMail({
      to: email,
      subject: 'Confirm your Lyrīon Birthday Book',
      text: [
        `You asked us to keep ${rows.length === 1 ? 'a birthday' : `${rows.length} birthdays`} in your Lyrīon Birthday Book and to remind you 21 days before each one.`,
        `Please confirm by opening this link:\n${l.confirm}`,
        'If this was not you, ignore this email and nothing more will be sent.',
        `To remove the book at any time: ${l.unsubscribe}`,
      ].join('\n\n'),
      headers: { 'List-Unsubscribe': `<${l.oneClick}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
  }
  return json({ ok: true, saved: rows.length });
}

async function withToken(purpose: string, email: string, token: string | null, fn: () => Promise<Response>): Promise<Response> {
  if (!EMAIL.test(email) || !(await verify(purpose, email, token))) return json({ error: 'This link is not valid.' }, 403);
  return fn();
}

async function reminders(req: Request, url: URL): Promise<Response> {
  if (req.headers.get('x-house-key') !== requireEnv('HOUSE_ENGINE_KEY')) return json({ error: 'Forbidden' }, 403);
  const days = Math.min(Math.max(Number(url.searchParams.get('days') ?? 21) || 21, 0), 60);
  const t = targetDate(days);
  // A 29 February birthday is remembered on 28 February in other years.
  const dayList = t.month === 2 && t.day === 28 && !t.leap ? [28, 29] : [t.day];
  const { data, error } = await db().from('birthday_book')
    .select('id, owner_email, owner_name, person_name, relationship, birth_month, birth_day')
    .eq('birth_month', t.month)
    .in('birth_day', dayList)
    .not('confirmed_at', 'is', null)
    .is('unsubscribed_at', null);
  if (error) return json({ error: 'Lookup failed' }, 500);
  const out = await Promise.all((data ?? []).map(async (r) => {
    const sign_ = houseCore.signFromBirthDate(r.birth_month, r.birth_day);
    const l = await links(r.owner_email);
    const mm = String(r.birth_month).padStart(2, '0');
    const dd = String(r.birth_day).padStart(2, '0');
    return {
      id: r.id,
      owner_email: r.owner_email,
      owner_name: r.owner_name,
      person_name: r.person_name,
      relationship: r.relationship,
      birthday: `${mm}-${dd}`,
      birthday_this_year: t.iso,
      sign: sign_,
      element: sign_ ? houseCore.ELEMENT_OF[sign_] : null,
      gift_concierge_url: `${SITE_URL}/gift-concierge?month=${r.birth_month}&day=${r.birth_day}&for=${encodeURIComponent(r.person_name)}`,
      unsubscribe_url: l.unsubscribe,
      list_unsubscribe: { url: l.oneClick, post: 'List-Unsubscribe=One-Click' },
    };
  }));
  return json({ date: t.iso, days, count: out.length, reminders: out });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = new URL(req.url);
  try {
    if (req.method === 'GET' && url.searchParams.get('action') === 'reminders') return await reminders(req, url);
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    // RFC 8058 one-click unsubscribe from the mail client: email and token in the query.
    if (url.searchParams.get('email') && url.searchParams.get('token')) {
      const email = url.searchParams.get('email')!.toLowerCase();
      return await withToken('bb-unsubscribe', email, url.searchParams.get('token'), async () => {
        await db().from('birthday_book').update({ unsubscribed_at: new Date().toISOString() }).eq('owner_email', email).is('unsubscribed_at', null);
        return json({ ok: true });
      });
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const email = clean(body.email, 200).toLowerCase();
    const token = body.token ? String(body.token) : null;
    switch (body.action) {
      case 'add':
        return await add(body);
      case 'confirm':
        return await withToken('bb-confirm', email, token, async () => {
          const { data } = await db().from('birthday_book').update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null })
            .eq('owner_email', email).is('confirmed_at', null).select('id');
          return json({ ok: true, confirmed: data?.length ?? 0 });
        });
      case 'unsubscribe':
        return await withToken('bb-unsubscribe', email, token, async () => {
          await db().from('birthday_book').update({ unsubscribed_at: new Date().toISOString() }).eq('owner_email', email).is('unsubscribed_at', null);
          return json({ ok: true });
        });
      case 'delete':
        return await withToken('bb-unsubscribe', email, token, async () => {
          const { data } = await db().from('birthday_book').delete().eq('owner_email', email).select('id');
          return json({ ok: true, deleted: data?.length ?? 0 });
        });
      default:
        return json({ error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('[birthday-book]', err instanceof Error ? err.message : err);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
