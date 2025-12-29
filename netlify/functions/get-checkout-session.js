// netlify/functions/get-checkout-session.js
const stripe = require('stripe')(
 process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY
);

exports.handler = async (event) => {
 try {
 const qs = event.queryStringParameters || {};
 const sessionId = qs.session_id;
 if (!sessionId) {
 return { statusCode: 400, body: JSON.stringify({ error: 'Missing session_id' }) };
 }

 // Retrieve the session and payment intent details
 const session = await stripe.checkout.sessions.retrieve(sessionId, {
 expand: ['payment_intent']
 });

 return {
 statusCode: 200,
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 id: session.id,
 status: session.status, // 'open' | 'complete' | 'expired'
 payment_status: session.payment_status, // 'paid' when successful
 amount_total: session.amount_total,
 currency: session.currency,
 email: session.customer_details?.email || null
 })
 };
 } catch (err) {
 return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
 }
};
