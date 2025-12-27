// functions/stripe-webhook.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { Resend } = require("resend");

exports.handler = async (event) => {
  console.log("webhook_hit");

  const sig =
    event.headers["stripe-signature"] ||
    event.headers["Stripe-Signature"] ||
    event.headers["STRIPE-SIGNATURE"];

  const rawBody = event.body;

  if (!sig) {
    console.log("missing_stripe_signature_header");
    return { statusCode: 400, body: "Missing Stripe signature" };
  }

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log("signature_ok", stripeEvent.type);
  } catch (err) {
    console.log("signature_fail", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      // IMPORTANT: use verified sender on lyrionatelier.com
      const to = "admin@lyrionatelier.com";
      const from = "Lyrion Atelier <admin@lyrionatelier.com>";
      const replyTo = session.customer_details?.email || undefined;

      if (!process.env.RESEND_API_KEY) {
        console.log("resend_missing_api_key");
      } else {
        const resend = new Resend(process.env.RESEND_API_KEY);

        console.log("email_send_start", { to, from, replyTo });

        const amount =
          typeof session.amount_total === "number"
            ? (session.amount_total / 100).toFixed(2)
            : "N/A";

        const currency = session.currency ? session.currency.toUpperCase() : "N/A";
        const customerEmail =
          session.customer_details?.email || session.customer_email || null;
        const customerEmailDisplay = customerEmail || "N/A";

        const result = await resend.emails.send({
          from,
          to,
          reply_to: replyTo,
          subject: `New Order • ${session.id}`,
          html: `
<h2>New Order</h2>
<p><strong>Order ID:</strong> ${session.id}</p>
<p><strong>Customer Email:</strong> ${customerEmailDisplay}</p>
<p><strong>Amount:</strong> ${amount} ${currency}</p>
`,
        });

        console.log("email_send_result", result);

        if (customerEmail) {
          try {
            console.log("customer_email_send_start", {
              to: customerEmail,
              from,
            });

            const customerEmailResult = await resend.emails.send({
              from,
              to: customerEmail,
              subject: "Order received ✨ Lyrion Atelier",
              html: `
<h2>Thank you for your order 🌙</h2>
<p>Your order <strong>${session.id}</strong> has landed.</p>
<p><strong>Amount:</strong> ${amount} ${currency}</p>
<p>We’re weaving celestial threads just for you. Expect another note when it ships.</p>
<p>If you didn’t place this order, reply to this email.</p>
`,
            });

            console.log("customer_email_send_ok", customerEmailResult);
          } catch (err) {
            console.log("customer_email_send_fail", err);
          }
        }
      }
    }

    // Always acknowledge Stripe to avoid retries
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    console.log("webhook_handler_error", err);
    // Still acknowledge to stop Stripe retry storms; logs will show root cause
    return {
      statusCode: 200,
      body: JSON.stringify({ received: true, error: err.message }),
    };
  }
};
