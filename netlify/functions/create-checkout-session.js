const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
 const headers = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Headers': 'Content-Type',
 'Access-Control-Allow-Methods': 'POST, OPTIONS',
 'Content-Type': 'application/json'
 };

 if (event.httpMethod === 'OPTIONS') {
 return { statusCode: 200, headers, body: '' };
 }

 if (event.httpMethod !== 'POST') {
 return {
 statusCode: 405,
 headers,
 body: JSON.stringify({ error: 'Method not allowed' })
 };
 }

 try {
 const { productName, productPrice, productType } = JSON.parse(event.body);

 if (!productName || !productPrice) {
 return {
 statusCode: 400,
 headers,
 body: JSON.stringify({ error: 'Missing productName or productPrice' })
 };
 }

 const priceNum = parseFloat(productPrice);
 if (isNaN(priceNum) || priceNum <= 0) {
 return {
 statusCode: 400,
 headers,
 body: JSON.stringify({ error: 'Invalid price' })
 };
 }

 console.log('Creating checkout session for:', productName, priceNum);

 const origin = event.headers.origin || event.headers.referer || 'https://lyrionatelier.com';
 const baseUrl = origin.replace(/\/$/, '');

 const session = await stripe.checkout.sessions.create({
 payment_method_types: ['card'],
 line_items: [
 {
 price_data: {
 currency: 'usd',
 product_data: {
 name: productName,
 description: 'Lyrion Atelier - Personalized Oracle Reading',
 },
 unit_amount: Math.round(priceNum * 100),
 },
 quantity: 1,
 },
 ],
 mode: 'payment',
 success_url: baseUrl + '/success.html?session_id={CHECKOUT_SESSION_ID}',
 cancel_url: baseUrl + '/oracle.html',
 customer_email: null,
 billing_address_collection: 'required',
 metadata: {
 product_type: productType || 'oracle_reading',
 product_name: productName,
 },
 });

 console.log('Checkout session created:', session.id);

 return {
 statusCode: 200,
 headers,
 body: JSON.stringify({
 url: session.url,
 sessionId: session.id
 })
 };

 } catch (error) {
 console.error('Error creating checkout session:', error);
 return {
 statusCode: 500,
 headers,
 body: JSON.stringify({
 error: 'Failed to create checkout session',
 message: error.message
 })
 };
 }
};
