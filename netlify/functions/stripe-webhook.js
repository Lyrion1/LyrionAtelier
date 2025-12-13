const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      console.log('✅ Payment successful:', session.id);
      console.log('Customer email:', session.customer_details.email);
      console.log('Amount paid:', session.amount_total / 100);

      // TODO: Send confirmation email
      // TODO: If oracle reading, send reading to customer
      // TODO: If physical product, create Printful order

      break;

    case 'payment_intent.succeeded':
      const paymentIntent = stripeEvent.data.object;
      console.log('✅ PaymentIntent succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = stripeEvent.data.object;
      console.error('❌ Payment failed:', failedPayment.id);
      break;

    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
