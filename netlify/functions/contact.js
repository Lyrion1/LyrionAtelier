const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const toEmail = process.env.CONTACT_TO_EMAIL || process.env.ADMIN_EMAIL || 'admin@lyrionatelier.com';
const fromEmail = process.env.CONTACT_FROM_EMAIL || process.env.ADMIN_EMAIL || 'onboarding@resend.dev';

const buildResponse = (statusCode, payload) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const isValidEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || '').trim());
const clean = (value) => String(value || '').trim();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { ok: false, error: 'Method Not Allowed' });
  }

  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body;
  let payload = {};

  try {
    payload = JSON.parse(rawBody || '{}');
  } catch (err) {
    return buildResponse(400, { ok: false, error: 'Invalid request payload' });
  }

  const {
    name,
    email,
    subject = '',
    reason = '',
    message = '',
    'bot-field': botField = '',
    pageUrl,
    userAgent
  } = payload;

  if (botField) {
    return buildResponse(200, { ok: true, skipped: true });
  }

  if (!clean(name)) {
    return buildResponse(400, { ok: false, error: 'Name is required.' });
  }

  if (!isValidEmail(email)) {
    return buildResponse(400, { ok: false, error: 'Valid email is required.' });
  }

  if (clean(message).length < 10) {
    return buildResponse(400, { ok: false, error: 'Message must be at least 10 characters.' });
  }

  if (!resend) {
    return buildResponse(500, { ok: false, error: 'Email service not configured.' });
  }

  const subjectLine = clean(subject) || `New contact: ${clean(reason) || 'General'}`;
  const timestamp = new Date().toISOString();

  const adminHtml = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color:#0f172a; line-height:1.6;">
      <h2 style="color:#a16207;">New Contact Message</h2>
      <p><strong>Name:</strong> ${clean(name)}</p>
      <p><strong>Email:</strong> ${clean(email)}</p>
      <p><strong>Reason:</strong> ${clean(reason)}</p>
      ${clean(subject) ? `<p><strong>Subject:</strong> ${clean(subject)}</p>` : ''}
      <p><strong>Message:</strong><br>${clean(message).replace(/\n/g, '<br>')}</p>
      <hr>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      ${pageUrl ? `<p><strong>Page URL:</strong> ${clean(pageUrl)}</p>` : ''}
      ${userAgent ? `<p><strong>User Agent:</strong> ${clean(userAgent)}</p>` : ''}
    </div>
  `;

  const customerHtml = `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color:#0f172a; line-height:1.6;">
      <h2 style="color:#a16207;">We received your message</h2>
      <p>Thank you for reaching out to Lyrion Atelier. Our celestial concierge will reply within 1-2 business days.</p>
      <p><strong>Your message:</strong><br>${clean(message).replace(/\n/g, '<br>')}</p>
      <p style="margin-top:16px;">If you need to add anything, simply reply to this email.</p>
      <p style="margin-top:24px; color:#6b7280;">With warmth,<br>The Lyrion Atelier team</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: `Lyrion Atelier <${fromEmail}>`,
      to: toEmail,
      reply_to: clean(email),
      subject: subjectLine,
      html: adminHtml
    });

    if (clean(email)) {
      await resend.emails.send({
        from: `Lyrion Atelier <${fromEmail}>`,
        to: clean(email),
        reply_to: toEmail,
        subject: 'We received your message',
        html: customerHtml
      });
    }

    return buildResponse(200, { ok: true });
  } catch (error) {
    console.error('Failed to send contact emails', error);
    return buildResponse(500, { ok: false, error: 'Unable to send email at this time.' });
  }
};
