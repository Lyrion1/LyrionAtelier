const Stripe = require('stripe');
const { Resend } = require('resend');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const adminEmail = process.env.ADMIN_EMAIL;

const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = 'Lyrion Atelier <admin@lyrionatelier.com>';
const replyToEmail = 'admin@lyrionatelier.com';

const zeroDecimalCurrencies = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

const formatAmount = (amount, currency = 'USD') => {
  const normalizedCurrency = currency.toUpperCase();
  const divisor = zeroDecimalCurrencies.has(normalizedCurrency) ? 1 : 100;
  const value = typeof amount === 'number' ? amount / divisor : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: zeroDecimalCurrencies.has(normalizedCurrency) ? 0 : 2,
  }).format(value);
};

const buildAdminHtml = (session) => {
  const customerEmail = session?.customer_details?.email || session?.customer_email || 'Unknown';
  const amount = formatAmount(session?.amount_total, session?.currency || 'USD');
  const currency = (session?.currency || 'USD').toUpperCase();
  const sessionId = session?.id || 'N/A';

  return `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; background: #0b1021; color: #f3f4f6; border-radius: 12px;">
    <h2 style="margin: 0 0 12px; color: #fbbf24;">New Order – Lyrion Atelier</h2>
    <p style="margin: 0 0 20px; color: #e5e7eb;">A new Stripe checkout session has completed successfully.</p>
    <div style="background: #111827; border: 1px solid #1f2937; border-radius: 10px; padding: 16px;">
      <p style="margin: 0 0 10px;"><strong style="color:#fbbf24;">Customer Email:</strong> ${customerEmail}</p>
      <p style="margin: 0 0 10px;"><strong style="color:#fbbf24;">Amount:</strong> ${amount}</p>
      <p style="margin: 0 0 10px;"><strong style="color:#fbbf24;">Currency:</strong> ${currency}</p>
      <p style="margin: 0;"><strong style="color:#fbbf24;">Session ID:</strong> ${sessionId}</p>
    </div>
  </div>
  `;
};

const buildCustomerHtml = (session) => {
  const customerName = session?.customer_details?.name || 'Customer';
  const amount = formatAmount(session?.amount_total, session?.currency || 'USD');
  const sessionId = session?.id || '';

  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background: #0f172a; color: #e5e7eb; padding: 32px 20px;">
    <div style="max-width: 640px; margin: 0 auto; background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(79,70,229,0.12)); border: 1px solid rgba(251,191,36,0.35); border-radius: 14px; padding: 28px;">
      <div style="text-align: center; margin-bottom: 18px;">
        <h1 style="margin: 0; color: #fbbf24; letter-spacing: 0.02em;">Order confirmed – Lyrion Atelier</h1>
        <p style="margin: 8px 0 0; color: rgba(229,231,235,0.9);">Thank you, ${customerName}! Your order is on its way.</p>
      </div>
      <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(99,102,241,0.4); border-radius: 12px; padding: 18px; margin: 20px 0;">
        <p style="margin: 0 0 10px;"><strong style="color:#fbbf24;">Order Total:</strong> ${amount}</p>
        ${sessionId ? `<p style="margin: 0;"><strong style="color:#fbbf24;">Session ID:</strong> ${sessionId}</p>` : ''}
      </div>
      <div style="line-height: 1.6; color: rgba(229,231,235,0.9);">
        <p style="margin: 0 0 10px;">We’ll send you another email once your items ship. If you have any questions, simply reply to this email and we’ll be happy to help.</p>
        <p style="margin: 0;">With gratitude,<br/>The Lyrion Atelier team</p>
      </div>
    </div>
  </div>
  `;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!stripe || !webhookSecret || !resend || !adminEmail) {
    console.error('Missing configuration for Stripe or Resend.', {
      stripeConfigured: Boolean(stripe),
      webhookSecret: Boolean(webhookSecret),
      resendConfigured: Boolean(resend),
      adminEmail: Boolean(adminEmail),
    });
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const sig = event.headers["stripe-signature"];
  if (!sig) {
    return { statusCode: 400, body: 'Invalid signature' };
  }
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, "base64")
    : Buffer.from(event.body, "utf8");
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature verification failed:', {
      message: err?.message,
      sigExists: Boolean(sig),
      isBase64Encoded: event.isBase64Encoded,
      bodyLength: event.body?.length,
      webhookSecretStart: process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 8),
    });
    return { statusCode: 400, body: 'Invalid signature' };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const sessionId = stripeEvent.data.object.id;
    let session;

    try {
      session = await stripe.checkout.sessions.retrieve(sessionId);
    } catch (err) {
      console.error('Failed to retrieve session:', { sessionId, error: err });
      return { statusCode: 500, body: 'Session retrieval error' };
    }

    if (session?.metadata?.email_sent === 'true') {
      return { statusCode: 200, body: 'duplicate_ignored' };
    }

    const customerEmail = session?.customer_details?.email || session?.customer_email || null;

    try {
      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        reply_to: replyToEmail,
        subject: 'New Order – Lyrion Atelier',
        html: buildAdminHtml(session),
      });

      if (customerEmail) {
        await resend.emails.send({
          from: fromEmail,
          to: customerEmail,
          reply_to: replyToEmail,
          subject: 'Order confirmed – Lyrion Atelier',
          html: buildCustomerHtml(session),
        });
      }

      await stripe.checkout.sessions.update(sessionId, {
        metadata: { ...(session.metadata || {}), email_sent: 'true' },
      });
    } catch (err) {
      console.error('Failed to send emails:', err);
      return { statusCode: 500, body: 'Email error' };
    }
  }

  return { statusCode: 200, body: 'ok' };
};
