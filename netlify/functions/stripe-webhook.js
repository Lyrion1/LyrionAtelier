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
        const productType = session.metadata?.product_type || "merchandise";
        const readingId =
          session.metadata?.reading_id || session.metadata?.product_id || null;
        const certificateTier = session.metadata?.certificate_tier || null;
        const isService =
          productType === "oracle_reading" ||
          productType === "compatibility_certificate";
        const deliveryLookup = {
          "life-path": "Delivered within 48 hours.",
          "solar-return": "Delivered within 48 hours.",
          "natal-chart-blueprint": "Delivered within 72 hours.",
          "chiron-wound-healing": "Delivered within 48 hours.",
          "full-cosmic-synthesis": "Delivered within 5 business days.",
          "career-purpose-reading": "Delivered within 72 hours.",
          "relationship-synastry": "Delivered within 72 hours.",
          "transit-forecast": "Delivered within 48 hours.",
          "lunar-nodes-reading": "Delivered within 72 hours.",
          "digital-certificate": "Digital delivery to your inbox.",
          "luxury-print": "Ships within 5-7 business days.",
          "museum-framed": "Ships within 5-7 business days with white-glove handling.",
          "twin-flames": "Ships within 5-7 business days with white-glove handling."
        };
        const deliveryEstimate =
          (readingId && deliveryLookup[readingId]) ||
          (certificateTier && deliveryLookup[certificateTier]) ||
          null;
        const serviceInstructions = isService
          ? `
            <div style="background: rgba(212, 175, 55, 0.08); border-left: 4px solid #d4af37; padding: 16px; margin: 18px 0;">
              <h3 style="margin: 0 0 10px; color: #d4af37;">Next Steps</h3>
              <p style="margin: 6px 0;">Reply to this email with ${productType === "compatibility_certificate"
                ? "both partners’ full names, birth dates, birth times (if known), and birth locations"
                : "your full name, birth date, birth time (if known), and birth location"
              } so we can begin your reading.</p>
              ${deliveryEstimate ? `<p style="margin: 6px 0;"><strong>Delivery window:</strong> ${deliveryEstimate}</p>` : ""}
              <p style="margin: 6px 0;">We will confirm once your reading is complete and ready.</p>
            </div>
          `
          : "";
        const shippingNote = isService
          ? ""
          : `<p>We’re weaving celestial threads just for you. Expect another note when it ships.</p>`;

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
${readingId ? `<p><strong>Offering:</strong> ${readingId}</p>` : ""}
${certificateTier ? `<p><strong>Certificate Tier:</strong> ${certificateTier}</p>` : ""}
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
${serviceInstructions}
${shippingNote}
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
