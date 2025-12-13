const Stripe = require('stripe');
const { Resend } = require('resend');
const resendApiKey = process.env.RESEND_API_KEY;
let resend = null;
let resendInitializationError = null;
try {
  resend = resendApiKey ? new Resend(resendApiKey) : null;
} catch (err) {
  console.error('Resend initialization failed:', err.message);
  resendInitializationError = err;
}
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const adminNotificationEmail = 'info@lyrionatelier.com';
let stripe = null;
let stripeInitializationError = null;
try {
  stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;
} catch (err) {
  console.error('Stripe initialization failed:', err.message);
  stripeInitializationError = err;
}
// Explicit debug flag that is ignored in production
const debugLoggingEnabled =
  process.env.STRIPE_WEBHOOK_DEBUG === 'true' &&
  process.env.NODE_ENV !== 'production';
const logDebug = (message, value) => {
  if (!debugLoggingEnabled) {
    return;
  }
  if (typeof value === 'function') {
    console.log(message, value());
  } else if (typeof value !== 'undefined') {
    console.log(message, value);
  } else {
    console.log(message);
  }
};
exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (stripeInitializationError || !stripe || !webhookSecret) {
    console.error('Missing Stripe configuration.', stripeInitializationError);
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const headers = event.headers || {};
  const sig = headers['stripe-signature'] || headers['Stripe-Signature'];
  if (!sig) {
    console.error('Missing Stripe signature header.');
    return { statusCode: 400, body: 'Missing Stripe signature header' };
  }
  let body = event.body;
  if (event.isBase64Encoded) {
    body = Buffer.from(event.body || '', 'base64');
  }
  const isValidBody = typeof body === 'string' || Buffer.isBuffer(body);
  if (!isValidBody) {
    console.error('Invalid webhook payload type.');
    return { statusCode: 400, body: 'Invalid webhook payload' };
  }

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      console.log('✅ checkout.session.completed event received');
      logDebug('Checkout session ID:', session.id);
      logDebug('Customer associated:', () => Boolean(session.customer));
      logDebug('Amount total (minor units):', session.amount_total);
      logDebug('Currency:', session.currency);

      const customerEmail = session?.customer_details?.email;
      const amountPaid = typeof session.amount_total === 'number' ? (session.amount_total / 100).toFixed(2) : null;

      if (!resend) {
        console.error('Resend client not configured. Skipping email notifications.', resendInitializationError);
      } else {
        if (customerEmail) {
          try {
            await resend.emails.send({
              from: 'Lyrion Atelier <orders@lyrionatelier.com>',
              to: customerEmail,
              subject: 'Your Lyrion Atelier Order Confirmed!',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #fff; padding: 40px; border-radius: 16px;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #fbbf24; font-size: 32px; margin-bottom: 8px;">Thank You!</h1>
                    <p style="color: rgba(255,255,255,0.8); font-size: 18px;">Your order has been confirmed</p>
                  </div>

                  <div style="background: rgba(139, 92, 246, 0.1); padding: 24px; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.2); margin-bottom: 24px;">
                    <h2 style="color: #fbbf24; font-size: 20px; margin-bottom: 16px;">Order Details</h2>
                    <p style="margin: 8px 0;"><strong>Order ID:</strong> ${session.id}</p>
                    <p style="margin: 8px 0;"><strong>Amount Paid:</strong> $${amountPaid ?? '0.00'}</p>
                    <p style="margin: 8px 0;"><strong>Payment Status:</strong> <span style="color: #10b981;">Confirmed</span></p>
                  </div>

                  <div style="margin-bottom: 24px;">
                    <h3 style="color: #fbbf24; font-size: 18px; margin-bottom: 12px;">What happens next?</h3>
                    <ul style="line-height: 1.8; color: rgba(255,255,255,0.9);">
                      <li>If you ordered an oracle reading, you'll receive your personalized PDF within 3-5 business days</li>
                      <li>If you ordered merchandise, we'll send tracking info once your item ships</li>
                      <li>Check your email for updates</li>
                    </ul>
                  </div>

                  <div style="text-align: center; padding-top: 24px; border-top: 1px solid rgba(251, 191, 36, 0.2);">
                    <p style="color: rgba(255,255,255,0.7); font-size: 14px;">Questions? Reply to this email or visit our <a href="https://lyrionatelier.com/contact.html" style="color: #fbbf24;">contact page</a></p>
                  </div>
                </div>
              `
            });

            console.log('✅ Customer confirmation email sent');
          } catch (emailError) {
            console.error('❌ Failed to send customer email:', emailError);
          }
        } else {
          console.error('Customer email missing; skipping confirmation email.');
        }

        if (adminNotificationEmail) {
          try {
            const stripeDashboardUrl = session.payment_intent
              ? `https://dashboard.stripe.com/payments/${session.payment_intent}`
              : 'https://dashboard.stripe.com/payments';

            await resend.emails.send({
              from: 'Lyrion Atelier <orders@lyrionatelier.com>',
              to: adminNotificationEmail,
              subject: 'New Order Received!',
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                  <h2>New Order Alert!</h2>
                  <p><strong>Order ID:</strong> ${session.id}</p>
                  <p><strong>Customer Email:</strong> ${customerEmail ?? 'Not provided'}</p>
                  <p><strong>Customer Name:</strong> ${session?.customer_details?.name || 'Not provided'}</p>
                  <p><strong>Amount:</strong> $${amountPaid ?? '0.00'}</p>
                  <p><strong>Payment Status:</strong> Paid</p>

                  <hr>

                  <p><strong>Action Required:</strong></p>
                  <ul>
                    <li>If oracle reading: Create and send PDF within 3-5 business days</li>
                    <li>If physical product: Create order in Printful</li>
                  </ul>

                  <p><a href="${stripeDashboardUrl}">View in Stripe Dashboard</a></p>
                </div>
              `
            });

            console.log('✅ Admin notification email sent');
          } catch (emailError) {
            console.error('❌ Failed to send admin email:', emailError);
          }
        }
      }

      break;

    case 'payment_intent.succeeded':
      const paymentIntent = stripeEvent.data.object;
      console.log('✅ payment_intent.succeeded event received');
      logDebug('PaymentIntent ID:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = stripeEvent.data.object;
      console.error('❌ payment_intent.payment_failed event received');
      logDebug('PaymentIntent ID:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
