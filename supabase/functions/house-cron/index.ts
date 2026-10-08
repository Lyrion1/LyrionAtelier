// Scheduled sweep, called by .github/workflows/house-cron.yml. It
//   - writes a heartbeat row, so the Supabase project never counts as idle,
//   - retries Printful orders that failed,
//   - retries drafts that could not be written,
//   - reminds the owner of readings and certificates still awaiting approval.
// Protected by the HOUSE_CRON_KEY secret in the x-house-key header.
import { json, OWNER_EMAIL, requireEnv, SITE_URL } from '../_shared/env.ts';
import { db } from '../_shared/db.ts';
import { sendMail } from '../_shared/mail.ts';
import { canRetryPrintful, fulfilPrintful, generateDelivery } from '../_shared/fulfil.ts';
import { sign } from '../_shared/tokens.ts';

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-house-key') !== requireEnv('HOUSE_CRON_KEY')) return json({ error: 'Forbidden' }, 403);
  const report = { heartbeat: false, printful_retried: 0, printful_recovered: 0, drafts_retried: 0, owner_reminders: 0, retention_cleared: 0 };

  const beat = await db().from('heartbeat').upsert({ id: 1, beat_at: new Date().toISOString() });
  report.heartbeat = !beat.error;

  // Failed sends, and sends whose worker stopped mid-way (a claim older than
  // ten minutes; the claim function lets the retry take it over).
  const stale = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: failed } = await db().from('orders').select('id, printful_attempts')
    .or(`printful_status.eq.failed,and(printful_status.eq.sending,printful_claimed_at.lt.${stale})`)
    .limit(20);
  for (const o of failed ?? []) {
    if (!canRetryPrintful(o.printful_attempts)) continue;
    report.printful_retried += 1;
    if (await fulfilPrintful(o.id)) report.printful_recovered += 1;
  }

  const { data: pending } = await db().from('deliveries').select('id').eq('status', 'awaiting_generation').lt('attempts', 10).limit(5);
  for (const d of pending ?? []) {
    report.drafts_retried += 1;
    await generateDelivery(d.id);
  }

  // Remind once a day about anything waiting more than 12 hours.
  const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: waiting } = await db().from('deliveries')
    .select('id, product_title, due_at, reminded_at, created_at')
    .eq('status', 'awaiting_approval')
    .lt('created_at', cutoff);
  const due = (waiting ?? []).filter((w) => !w.reminded_at || w.reminded_at < dayAgo);
  if (due.length) {
    const lines = await Promise.all(due.map(async (w) =>
      `${w.product_title}, due ${new Date(w.due_at).toUTCString()}:\n${SITE_URL}/approve?id=${w.id}&token=${encodeURIComponent(await sign('approve', w.id))}`
    ));
    await sendMail({
      to: OWNER_EMAIL,
      subject: `${due.length} reading${due.length === 1 ? '' : 's'} or certificate${due.length === 1 ? '' : 's'} awaiting your approval`,
      text: `These are written and waiting for you. The 48-hour promise runs from the time of order.\n\n${lines.join('\n\n')}`,
    });
    await db().from('deliveries').update({ reminded_at: new Date().toISOString() }).in('id', due.map((w) => w.id));
    report.owner_reminders = due.length;
  }

  // Retention promised in the privacy policy.
  const yearAgo = new Date(Date.now() - 365 * 24 * 3600_000).toISOString();
  const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 3600_000).toISOString();
  const cleared = await db().from('deliveries').update({ draft: null, details: {}, gift_note: null })
    .lt('delivered_at', yearAgo).neq('details', '{}').select('id');
  const unsubscribed = await db().from('birthday_book').delete().lt('unsubscribed_at', yearAgo).select('id');
  const enquiries = await db().from('enquiries').delete().lt('created_at', threeYearsAgo).select('id');
  report.retention_cleared = (cleared.data?.length ?? 0) + (unsubscribed.data?.length ?? 0) + (enquiries.data?.length ?? 0);

  return json(report);
});
