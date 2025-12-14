const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  // Verify webhook signature
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error(' Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle different event types
  switch (stripeEvent.type) {
    case 'checkout.session.completed':
      const session = stripeEvent.data.object;
      
      console.log(' Payment successful!');
      console.log('Order ID:', session.id);
      console.log('Customer:', session.customer_details.email);
      console.log('Amount:', session.amount_total / 100);
      
      // Send confirmation email to customer
      try {
        await resend.emails.send({
          from: 'Lyrion Atelier <orders@lyrionatelier.com>',
          to: session.customer_details.email,
          subject: ' Your Lyrion Atelier Order Confirmed!',
          html: `
          <!DOCTYPE html>
          <html>
          <head>
          <style>
          body { font-family: Arial, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05)); border-radius: 16px; padding: 40px; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { color: #fbbf24; font-size: 32px; margin: 0 0 8px 0; }
          .header p { color: rgba(255,255,255,0.8); font-size: 18px; margin: 0; }
          .order-box { background: rgba(139, 92, 246, 0.15); padding: 24px; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.2); margin: 24px 0; }
          .order-box h2 { color: #fbbf24; font-size: 20px; margin: 0 0 16px 0; }
          .order-detail { margin: 8px 0; line-height: 1.6; }
          .order-detail strong { color: #fbbf24; }
          .status-badge { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; }
          .next-steps { margin: 24px 0; }
          .next-steps h3 { color: #fbbf24; font-size: 18px; margin-bottom: 12px; }
          .next-steps ul { line-height: 1.8; color: rgba(255,255,255,0.9); padding-left: 20px; }
          .footer { text-align: center; padding-top: 24px; border-top: 1px solid rgba(251, 191, 36, 0.2); margin-top: 32px; }
          .footer p { color: rgba(255,255,255,0.7); font-size: 14px; }
          .footer a { color: #fbbf24; text-decoration: none; }
          </style>
          </head>
          <body>
          <div class="container">
          <div class="header">
          <h1>Thank You! </h1>
          <p>Your order has been confirmed</p>
          </div>
          
          <div class="order-box">
          <h2>Order Details</h2>
          <div class="order-detail"><strong>Order ID:</strong> ${session.id}</div>
          <div class="order-detail"><strong>Customer:</strong> ${session.customer_details.name || 'Valued Customer'}</div>
          <div class="order-detail"><strong>Email:</strong> ${session.customer_details.email}</div>
          <div class="order-detail"><strong>Amount Paid:</strong> $${(session.amount_total / 100).toFixed(2)} USD</div>
          <div class="order-detail"><strong>Payment Status:</strong> <span class="status-badge">Confirmed</span></div>
          </div>
          
          <div class="next-steps">
          <h3>What happens next?</h3>
          <ul>
          <li><strong>Oracle Readings:</strong> You'll receive your personalized PDF reading within 3-5 business days at this email address</li>
          <li><strong>Merchandise:</strong> We'll send you tracking information once your item ships (typically 3-7 business days)</li>
          <li><strong>Questions?</strong> Simply reply to this email - we're here to help!</li>
          </ul>
          </div>
          
          <div class="footer">
          <p>Questions? Contact us at <a href="mailto:admin@lyrionatelier.com">admin@lyrionatelier.com</a></p>
          <p style="margin-top: 16px; color: rgba(255,255,255,0.5); font-size: 12px;">
          Lyrion Atelier | Celestial guidance and astrology-inspired fashion
          </p>
          </div>
          </div>
          </body>
          </html>
          `
        });
        
        console.log(' Customer confirmation email sent to:', session.customer_details.email);
        
      } catch (emailError) {
        console.error(' Failed to send customer email:', emailError);
      }
      
      // Send notification email to shop owner
      try {
        await resend.emails.send({
          from: 'Lyrion Atelier <orders@lyrionatelier.com>',
          to: 'admin@lyrionatelier.com',
          subject: ' New Order Received - Lyrion Atelier',
          html: `
          <!DOCTYPE html>
          <html>
          <head>
          <style>
          body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2 4px rgba(0,0,0,0.1); }
          h2 { color: #10b981; margin-top: 0; }
          .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; }
          .detail-row { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .label { font-weight: 600; color: #374151; display: inline-block; width: 140px; }
          .value { color: #1f2937; }
          .action-section { margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb; }
          .action-section h3 { color: #ef4444; font-size: 16px; }
          .action-list { background: #fef2f2; padding: 16px; border-radius: 4px; margin-top: 12px; }
          .action-list li { margin: 8px 0; color: #991b1b; }
          .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
          </style>
          </head>
          <body>
          <div class="container">
          <h2> New Order Alert!</h2>
          
          <div class="alert-box">
          <strong> Payment Received:</strong> $${(session.amount_total / 100).toFixed(2)} USD
          </div>
          
          <h3>Order Information</h3>
          <div class="detail-row">
          <span class="label">Order ID:</span>
          <span class="value">${session.id}</span>
          </div>
          <div class="detail-row">
          <span class="label">Customer Name:</span>
          <span class="value">${session.customer_details.name || 'Not provided'}</span>
          </div>
          <div class="detail-row">
          <span class="label">Customer Email:</span>
          <span class="value">${session.customer_details.email}</span>
          </div>
          <div class="detail-row">
          <span class="label">Amount Paid:</span>
          <span class="value">$${(session.amount_total / 100).toFixed(2)} USD</span>
          </div>
          <div class="detail-row">
          <span class="label">Payment Status:</span>
          <span class="value" style="color: #10b981; font-weight: 600;"> PAID</span>
          </div>
          <div class="detail-row">
          <span class="label">Order Date:</span>
          <span class="value">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</span>
          </div>
          
          <div class="action-section">
          <h3> Action Required:</h3>
          <div class="action-list">
          <ul>
          <li><strong>If Oracle Reading:</strong> Create and send personalized PDF within 3-5 business days to ${session.customer_details.email}</li>
          <li><strong>If Physical Product:</strong> Create order in Printful and update customer with tracking info</li>
          <li><strong>Customer Confirmation:</strong> Customer has already received automated confirmation email</li>
          </ul>
          </div>
          </div>
          
          <a href="https://dashboard.stripe.com/payments/${session.payment_intent}" class="btn">
          View in Stripe Dashboard →
          </a>
          </div>
          </body>
          </html>
          `
        });
        
        console.log(' Admin notification email sent to: admin@lyrionatelier.com');
        
      } catch (emailError) {
        console.error(' Failed to send admin email:', emailError);
      }
      
      break;

    case 'payment_intent.succeeded':
      const paymentIntent = stripeEvent.data.object;
      console.log(' PaymentIntent succeeded:', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = stripeEvent.data.object;
      console.error(' Payment failed:', failedPayment.id);
      break;

    default:
      console.log(` Unhandled event type: ${stripeEvent.type}`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
