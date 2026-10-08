// Written enquiries from the Partners page and the contact page. Each one is
// stored and emailed to the owner, with the sender as the reply-to address.
import { corsHeaders, json, OWNER_EMAIL } from '../_shared/env.ts';
import { db } from '../_shared/db.ts';
import { sendMail } from '../_shared/mail.ts';

const LANES = ['weddings', 'newborn-and-family', 'wellness', 'pets', 'workplaces', 'gift-shops'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/\r/g, '').trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  // Honeypot: a field people never see. Bots fill it; pretend all is well.
  if (clean(body.website, 200)) return json({ ok: true });

  const kind = body.kind === 'partner' ? 'partner' : 'contact';
  const name = clean(body.name, 80);
  const email = clean(body.email, 200).toLowerCase();
  const message = clean(body.message, 4000);
  const organisation = clean(body.organisation, 120) || null;
  const subject = clean(body.subject, 120) || null;
  const lane = kind === 'partner' && LANES.includes(String(body.lane)) ? String(body.lane) : null;
  if (!name || !EMAIL.test(email) || message.length < 10) {
    return json({ error: 'Please give your name, a valid email address and a message of at least a sentence.' }, 400);
  }
  if (kind === 'partner' && !lane) return json({ error: 'Please choose the kind of partnership.' }, 400);

  const { error } = await db().from('enquiries').insert({ kind, lane, name, email, organisation, subject, message });
  if (error) console.error('[enquiry] store failed', error.message);
  try {
    await sendMail({
      to: OWNER_EMAIL,
      replyTo: email,
      subject: kind === 'partner' ? `Partner enquiry (${lane}): ${organisation ?? name}` : `Contact: ${subject ?? name}`,
      text: [
        `From: ${name} <${email}>`,
        organisation ? `Organisation: ${organisation}` : '',
        lane ? `Lane: ${lane}` : '',
        subject ? `Subject: ${subject}` : '',
        '',
        message,
      ].filter((l) => l !== null).join('\n'),
    });
  } catch (err) {
    console.error('[enquiry] email failed', err instanceof Error ? err.message : err);
    if (error) return json({ error: 'Your message could not be sent just now. Please email admin@lyrionatelier.com.' }, 500);
  }
  return json({ ok: true });
});
