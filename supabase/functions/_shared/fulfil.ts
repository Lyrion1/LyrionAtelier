// Fulfilment steps shared by stripe-webhook (first attempt) and house-cron
// (retries, reminders). Every step is idempotent: running it twice for the
// same order never ships or sends twice.
import { db } from './db.ts';
import { OWNER_EMAIL, SITE_URL } from './env.ts';
import { sendMail } from './mail.ts';
import { createConfirmedOrder, type PrintfulLine, type Recipient } from './printful.ts';
import { DISCLAIMER, writePiece, type Details } from './reading.ts';
import { sign } from './tokens.ts';
import { buildPdf } from './pdf.ts';
import { longDate, sunSign } from './astro.ts';

export interface PrintfulPayload {
  externalId: string;
  recipient: Recipient;
  items: PrintfulLine[];
  giftNote?: string;
}

const MAX_PRINTFUL_ATTEMPTS = 12;

/** Send the order to Printful. Returns true when Printful has it. */
export async function fulfilPrintful(orderId: string): Promise<boolean> {
  const { data: order, error } = await db().from('orders').select('*').eq('id', orderId).single();
  if (error || !order) throw new Error(`order ${orderId} not found`);
  if (order.printful_status === 'created' || order.printful_status === 'none') return true;
  const payload = order.printful_payload as PrintfulPayload;
  try {
    const result = await createConfirmedOrder(payload);
    await db().from('orders').update({
      printful_status: 'created',
      printful_order_id: result.id,
      printful_last_error: null,
      printful_attempts: order.printful_attempts + 1,
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = order.printful_attempts + 1;
    await db().from('orders').update({
      printful_status: 'failed',
      printful_attempts: attempts,
      printful_last_error: message.slice(0, 1000),
      updated_at: new Date().toISOString(),
    }).eq('id', orderId);
    // Tell the owner on the first failure and again when retries run out.
    if (!order.owner_alerted_at || attempts === MAX_PRINTFUL_ATTEMPTS) {
      await sendMail({
        to: OWNER_EMAIL,
        subject: attempts >= MAX_PRINTFUL_ATTEMPTS
          ? `Printful order still failing after ${attempts} attempts: ${payload.externalId}`
          : `Printful order failed, retrying: ${payload.externalId}`,
        text: [
          `A paid order could not be sent to Printful.`,
          `Payment: ${payload.externalId}`,
          `Error: ${message}`,
          `Items: ${payload.items.map((i) => `${i.quantity} x ${'external_variant_id' in i ? i.external_variant_id : i.sync_variant_id}`).join(', ')}`,
          `Ship to: ${payload.recipient.name}, ${payload.recipient.city}, ${payload.recipient.country_code}`,
          attempts >= MAX_PRINTFUL_ATTEMPTS
            ? 'Automatic retries have stopped. Please place this order in Printful by hand.'
            : 'It will be retried automatically every few hours. No action is needed unless it keeps failing.',
        ].join('\n\n'),
      }).catch((e) => console.error('[fulfil] owner alert failed', e));
      await db().from('orders').update({ owner_alerted_at: new Date().toISOString() }).eq('id', orderId);
    }
    return false;
  }
}

export function canRetryPrintful(attempts: number): boolean {
  return attempts < MAX_PRINTFUL_ATTEMPTS;
}

function namesOf(details: Details): string {
  return details.people.map((p) => p.name).join(' & ');
}

function personLines(details: Details): string[] {
  return details.people.map((p) => {
    const s = sunSign(p.date);
    if (details.kind === 'pet') {
      return [`${p.name}${details.species ? `, ${details.species}` : ''}`, longDate(p.date), s ? `Sun in ${s.sign}, ${s.element}, ${s.modality}` : '']
        .filter(Boolean)
        .join(' · ');
    }
    return [p.name, `born ${longDate(p.date)}${p.time ? ` at ${p.time}` : ''}${p.place ? `, ${p.place}` : ''}`, s ? `Sun in ${s.sign}, ${s.element}, ${s.modality}` : '']
      .filter(Boolean)
      .join(' · ');
  });
}

async function approvalLink(id: string): Promise<string> {
  return `${SITE_URL}/approve?id=${encodeURIComponent(id)}&token=${encodeURIComponent(await sign('approve', id))}`;
}

/** Write the draft for a delivery and ask the owner to approve it. */
export async function generateDelivery(id: string): Promise<void> {
  const { data: row } = await db().from('deliveries').select('*').eq('id', id).single();
  if (!row || row.status !== 'awaiting_generation') return;
  const details = row.details as Details;
  try {
    const draft = await writePiece(row.product_title, details, row.product_slug, new Date(row.created_at));
    await db().from('deliveries').update({ draft, status: 'awaiting_approval', last_error: null, attempts: row.attempts + 1 }).eq('id', id);
    await sendMail({
      to: OWNER_EMAIL,
      subject: `Approve: ${row.product_title} for ${namesOf(details)}`,
      text: [
        `A ${row.product_type} is ready for your review. It must reach the customer by ${new Date(row.due_at).toUTCString()}.`,
        `Open this link to read it, edit it if you wish, and send it with one click:\n${await approvalLink(id)}`,
        `Details: ${personLines(details).join(' | ')}${details.species ? ` | ${details.species}` : ''}`,
        `Draft:\n\n${draft}`,
      ].join('\n\n'),
    });
    await db().from('deliveries').update({ owner_notified_at: new Date().toISOString() }).eq('id', id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = row.attempts + 1;
    await db().from('deliveries').update({ attempts, last_error: message.slice(0, 1000) }).eq('id', id);
    if (attempts === 3) {
      await sendMail({
        to: OWNER_EMAIL,
        subject: `Could not write ${row.product_title} for ${namesOf(details)}`,
        text: `Automatic writing has failed three times (${message}). It will keep retrying; you can also write it by hand and send it from the approval page:\n${await approvalLink(id)}`,
      }).catch((e) => console.error('[fulfil] owner alert failed', e));
    }
  }
}

/** Build the PDF and send the approved piece. */
export async function deliver(id: string, approvedText: string): Promise<{ to: string }> {
  const { data: row } = await db().from('deliveries').select('*').eq('id', id).single();
  if (!row) throw new Error('Delivery not found');
  if (row.status === 'delivered') return { to: row.recipient_email || row.customer_email };
  const details = row.details as Details;
  const text = approvedText.trim();
  if (!text) throw new Error('The text is empty');
  const pdf = await buildPdf({
    eyebrow: row.product_type === 'reading' ? 'Personalised reading' : 'Certificate',
    title: row.product_title,
    names: namesOf(details),
    lines: personLines(details),
    text,
    disclaimer: DISCLAIMER,
  });
  const to = row.recipient_email || row.customer_email;
  const intro = row.recipient_email
    ? `Someone has sent you a ${row.product_title} from Lyrīon Atelier.${row.gift_note ? `\n\nTheir note: “${row.gift_note}”` : ''}`
    : `Your ${row.product_title} is ready. It is attached as a PDF to keep or print.`;
  await sendMail({
    to,
    replyTo: OWNER_EMAIL,
    subject: `Your ${row.product_title}`,
    text: `${intro}\n\n${text}\n\n${DISCLAIMER}`,
    attachments: [{ filename: `${row.product_slug}.pdf`, content: pdf }],
  });
  if (row.recipient_email && row.recipient_email !== row.customer_email) {
    await sendMail({
      to: row.customer_email,
      subject: `Your gift has been delivered: ${row.product_title}`,
      text: `The ${row.product_title} for ${namesOf(details)} has been sent to ${row.recipient_email}. A copy is attached for you.`,
      attachments: [{ filename: `${row.product_slug}.pdf`, content: pdf }],
    }).catch((e) => console.error('[fulfil] buyer copy failed', e));
  }
  await db().from('deliveries').update({
    draft: text,
    status: 'delivered',
    approved_at: new Date().toISOString(),
    delivered_at: new Date().toISOString(),
  }).eq('id', id);
  return { to };
}

/** Customer note sent when a reading or certificate has been ordered. */
export async function acknowledgeDigital(email: string, titles: string[]): Promise<void> {
  await sendMail({
    to: email,
    replyTo: OWNER_EMAIL,
    subject: 'Your Lyrīon order is being prepared',
    text: [
      `Thank you for your order. We are preparing: ${titles.join(', ')}.`,
      'Each piece is written from the birth details you gave and read by us before it is sent. It will reach you by email within 48 hours.',
      `If any detail needs correcting, reply to this email. ${SITE_URL}`,
    ].join('\n\n'),
  });
}
