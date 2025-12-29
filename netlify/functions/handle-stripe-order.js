const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify Stripe webhook signature
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  // Handle successful checkout
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    try {
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product']
      });

      // 1. Create Printful order (manual fulfillment for now)
      console.log('Order received for manual fulfillment:', session.id);
      
      // 2. Send customer confirmation email
      await sendCustomerEmail(session, lineItems.data);

      // 3. Send admin notification email
      await sendAdminEmail(session, lineItems.data);

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } catch (error) {
      console.error('Order processing error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};

// Send customer confirmation email
async function sendCustomerEmail(session, lineItems) {
  const itemsList = lineItems.map(item => 
    `<li>${item.quantity}x ${item.description} - $${(item.amount_total / 100).toFixed(2)}</li>`
  ).join('');

  const emailHTML = `
  <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: linear-gradient(135deg, #0f0c29, #302b63); color: #ffffff; border-radius: 16px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-size: 3rem; margin-bottom: 20px;"> </div>
      <h1 style="font-size: 2rem; margin-bottom: 10px; font-weight: 300; letter-spacing: 2px; color: #d4af37;">The Stars Have Received Your Order</h1>
    </div>
    
    <p style="font-size: 1.1rem; line-height: 1.8; font-style: italic; color: #d4af37; margin-bottom: 30px; text-align: center;">
      Dear ${session.customer_details.name}, your cosmic blueprint is being woven into reality. 
      The universe conspires to deliver what you've claimed.
    </p>
    
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 30px; margin-bottom: 30px; backdrop-filter: blur(10px);">
      <h2 style="font-size: 1.3rem; margin-bottom: 15px; color: #d4af37;">Order Details</h2>
      <p style="margin-bottom: 10px;"><strong>Order Number:</strong> ${session.id.slice(-12).toUpperCase()}</p>
      <p style="margin-bottom: 10px;"><strong>Email:</strong> ${session.customer_details.email}</p>
      <p style="margin-bottom: 20px;"><strong>Total:</strong> $${(session.amount_total / 100).toFixed(2)}</p>
      
      <h3 style="font-size: 1.1rem; margin: 20px 0 10px; color: #d4af37;">Items Ordered:</h3>
      <ul style="list-style: none; padding: 0;">
        ${itemsList}
      </ul>
    </div>
    
    <div style="background: rgba(212, 175, 55, 0.1); border-left: 4px solid #d4af37; padding: 20px; margin-bottom: 30px;">
      <h3 style="margin-bottom: 15px; color: #d4af37;">What Happens Next</h3>
      <p style="margin-bottom: 10px;"> Your piece is being crafted with cosmic precision</p>
      <p style="margin-bottom: 10px;"> Shipping begins within 3-5 business days</p>
      <p style="margin-bottom: 10px;"> Tracking details will arrive via email</p>
    </div>
    
    <div style="text-align: center; margin-top: 40px;">
      <a href="https://lyrionatelier.com/oracle" style="display: inline-block; background: #d4af37; color: #0f0c29; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">Get Your Free Oracle Reading</a>
    </div>
    
    <p style="text-align: center; margin-top: 40px; font-size: 0.9rem; opacity: 0.7;">
      Questions? Reply to this email or contact admin@lyrionatelier.com
    </p>
  </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Lyrīon Atelier <admin@lyrionatelier.com>',
      to: session.customer_details.email,
      subject: ' Your Cosmic Order is Confirmed',
      html: emailHTML
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

// Send admin notification email
async function sendAdminEmail(session, lineItems) {
  const itemsList = lineItems.map(item => 
    `<li>${item.quantity}x ${item.description} - $${(item.amount_total / 100).toFixed(2)}</li>`
  ).join('');

  const emailHTML = `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a1a1a; margin-bottom: 20px;"> New Order Received</h2>
    
    <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
      <p style="margin-bottom: 10px;"><strong>Customer:</strong> ${session.customer_details.name}</p>
      <p style="margin-bottom: 10px;"><strong>Email:</strong> ${session.customer_details.email}</p>
      <p style="margin-bottom: 10px;"><strong>Phone:</strong> ${session.customer_details.phone || 'Not provided'}</p>
      <p style="margin-bottom: 10px;"><strong>Amount:</strong> $${(session.amount_total / 100).toFixed(2)}</p>
      <p style="margin-bottom: 10px;"><strong>Order ID:</strong> ${session.id}</p>
    </div>
    
    <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
      <h3 style="margin: 0 0 10px; color: #856404;">Items Ordered:</h3>
      <ul style="color: #856404; margin: 0; padding-left: 20px;">
        ${itemsList}
      </ul>
    </div>
    
    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3;">
      <h3 style="margin: 0 0 10px; color: #1565C0;">Shipping Address</h3>
      <p style="margin: 0; color: #1565C0;">
        ${session.shipping_details.name}<br>
        ${session.shipping_details.address.line1}<br>
        ${session.shipping_details.address.line2 ? session.shipping_details.address.line2 + '<br>' : ''}
        ${session.shipping_details.address.city}, ${session.shipping_details.address.state} ${session.shipping_details.address.postal_code}<br>
        ${session.shipping_details.address.country}
      </p>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee;">
      <p style="color: #28a745; font-weight: 600; margin: 0;">✓ Customer confirmation email sent automatically</p>
      <p style="color: #666; margin: 10px 0 0; font-size: 0.9rem;">Process this order in Printful manually and send tracking when available.</p>
    </div>
  </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Lyrīon System <admin@lyrionatelier.com>',
      to: 'admin@lyrionatelier.com',
      subject: ` New Order: ${session.customer_details.name} - $${(session.amount_total / 100).toFixed(2)}`,
      html: emailHTML
    })
  });
}
