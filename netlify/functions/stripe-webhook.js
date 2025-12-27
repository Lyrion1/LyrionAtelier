import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-11-17.clover" });

export async function handler(event) {
  // Stripe sends raw JSON as the request body. Netlify provides it as a string in event.body.
  const sig =
    event.headers["stripe-signature"] ||
    event.headers["Stripe-Signature"];

  try {
    const stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      console.log("checkout.session.completed", {
        id: session.id,
        email: session.customer_details?.email,
        amount_total: session.amount_total,
        currency: session.currency,
      });
    }

    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("stripe-webhook error", err?.message || err);
    // Important: still return 200 so Stripe doesn't keep failing/retrying
    return { statusCode: 200, body: "ok" };
  }
}
