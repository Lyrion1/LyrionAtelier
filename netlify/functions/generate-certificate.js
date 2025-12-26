const Stripe = require('stripe');
const { Resend } = require('resend');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY_TEST;
const webhookSecret = process.env.STRIPE_CERT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const conversationWebhook = process.env.CONVERSATION_USERS_WEBHOOK;
const conversationWebhookToken = process.env.CONVERSATION_USERS_TOKEN;

const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const buildResponse = (statusCode, payload) => ({
  statusCode,
  body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  headers: { 'Content-Type': 'application/json' }
});

function safeText(value) {
  return String(value || '').replace(/[<>]/g, '');
}

function formatCurrency(amount, currency = 'USD') {
  if (typeof amount !== 'number') return '';
  return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function createCertificateBuffer({ name, email, offering, amount }) {
  const lines = [
    'Lyrion Atelier Oracle Certificate',
    `Seeker: ${name}`,
    `Email: ${email}`,
    `Offering: ${offering}`,
    `Blessing: ${amount}`,
    `Issued: ${new Date().toLocaleDateString()}`
  ];
  const text = lines.join('\n');
  return Buffer.from(text);
}

async function sendCertificate(session) {
  if (!resend) {
    console.error('Resend not configured, certificate email skipped');
    return;
  }
  const customer = session.customer_details || {};
  if (!customer.email) {
    console.error('Missing customer email, cannot send certificate');
    return;
  }
  const certificate = createCertificateBuffer({
    name: safeText(customer.name || 'Seeker'),
    email: safeText(customer.email),
    offering: safeText(session.metadata?.reading_type || 'Oracle Reading'),
    amount: formatCurrency(session.amount_total, session.currency)
  });

  await resend.emails.send({
    from: 'Lyrion Atelier <orders@lyrionatelier.com>',
    to: customer.email,
    subject: 'Your Oracle Certificate is Ready',
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a;">
        <h2>Cosmic Certificate</h2>
        <p>The Oracle has sealed your reading with a keepsake. Your certificate is attached for safekeeping.</p>
        <p style="margin-top:12px;">If you need anything, reply to this message and we will answer swiftly.</p>
      </div>
    `,
    attachments: [
      {
        filename: 'oracle-certificate.txt',
        content: certificate.toString('base64'),
        contentType: 'text/plain'
      }
    ]
  });
}

async function updateConversationTier(session) {
  if (!conversationWebhook) {
    console.log('Conversation webhook not configured; skipping tier update.');
    return;
  }
  const customer = session.customer_details || {};
  const tier = session.metadata?.subscription_type || 'cosmic';
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (conversationWebhookToken) {
      headers.Authorization = `Bearer ${conversationWebhookToken}`;
    }
    await fetch(conversationWebhook, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: customer.email,
        tier,
        stripe_customer_id: session.customer,
        questions_this_month: 0,
        birth_chart: (() => {
          if (!session.metadata?.birth_chart) return null;
          try {
            return JSON.parse(session.metadata.birth_chart);
          } catch (err) {
            console.error('Invalid birth_chart metadata', err);
            return null;
          }
        })()
      })
    });
  } catch (err) {
    console.error('Failed to update conversation tier', err);
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return buildResponse(405, { error: 'Method Not Allowed' });
  }

  if (!stripe || !webhookSecret) {
    return buildResponse(500, { error: 'Stripe webhook not configured' });
  }

  const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  if (!signature) {
    return buildResponse(400, { error: 'Missing Stripe signature' });
  }

  let stripeEvent;
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64') : event.body;

  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook verification failed', err);
    return buildResponse(400, { error: `Webhook Error: ${err.message}` });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const productType = session.metadata?.product_type;

    if (productType === 'oracle_reading') {
      await sendCertificate(session);
    }

    if (productType === 'oracle_conversation' || session.mode === 'subscription') {
      await updateConversationTier(session);
    }
  }

  return buildResponse(200, { received: true });
};
