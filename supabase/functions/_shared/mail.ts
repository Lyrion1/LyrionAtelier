// Transactional email through Resend. Every message carries the operator line.
import { env, escapeHtml, OPERATOR_LINE } from './env.ts';

export interface Attachment {
  filename: string;
  content: string; // base64
}

export interface MailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  attachments?: Attachment[];
  headers?: Record<string, string>;
}

function wrapHtml(bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f8f4ec;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:Georgia,'Times New Roman',serif;color:#1c1420;font-size:16px;line-height:1.6;">
<p style="font-family:Georgia,serif;letter-spacing:0.2em;text-transform:uppercase;font-size:13px;color:#8a6d2f;margin:0 0 24px;border-bottom:1px solid rgba(28,20,32,0.12);padding-bottom:12px;">Lyrīon Atelier</p>
${bodyHtml}
<p style="margin-top:32px;border-top:1px solid rgba(28,20,32,0.12);padding-top:12px;font-size:12px;color:#4a4152;">${escapeHtml(OPERATOR_LINE)}</p>
</div></body></html>`;
}

/** Plain paragraphs to simple HTML. */
export function paragraphsToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export async function sendMail(opts: MailOptions): Promise<{ id?: string }> {
  const key = env('RESEND_API_KEY');
  if (!key) throw new Error('RESEND_API_KEY is not configured');
  const from = env('MAIL_FROM');
  if (!from) throw new Error('MAIL_FROM is not configured');
  const body: Record<string, unknown> = {
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    text: `${opts.text}\n\n--\n${OPERATOR_LINE}`,
    html: wrapHtml(opts.html ?? paragraphsToHtml(opts.text)),
  };
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.attachments?.length) body.attachments = opts.attachments;
  if (opts.headers) body.headers = opts.headers;
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(`Resend ${resp.status}: ${JSON.stringify(data)}`);
  return data as { id?: string };
}
