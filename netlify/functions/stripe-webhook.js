// ✅ ACTIVE WEBHOOK HANDLER
// This is the primary webhook handler for Stripe checkout.session.completed events
// Features:
// - Automatic Printful order creation for physical products
// - Email notifications to admin@lyrionatelier.com
// - Comprehensive error handling and logging
// - Serverless-optimized (no file system dependencies)
//
// Webhook URL: https://lyrionatelier.com/.netlify/functions/stripe-webhook
// Alternate URL: https://lyrionatelier.com/api/stripe-webhook
//
// Required Environment Variables:
// - STRIPE_SECRET_KEY_LIVE (or STRIPE_SECRET_KEY)
// - STRIPE_WEBHOOK_SECRET
// - PRINTFUL_API_KEY
// - RESEND_API_KEY
// - OWNER_EMAIL (set to admin@lyrionatelier.com)
//
// See WEBHOOK_SETUP.md for full documentation
//
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

const FROM_EMAIL = process.env.ORDER_FROM || 'orders@lyrionatelier.com';
const ADMIN_EMAIL = process.env.OWNER_EMAIL || 'admin@lyrionatelier.com';

// Inline product mapping to avoid file system issues in serverless
const PRODUCT_MAPPING = {
  "products": [
    {
      "name": "Taurus Constellation Pyjama Top",
      "printfulVariantId": "6951f0e5ede708",
      "type": "physical"
    },
    {
      "name": "Taurus All-Over Print Crop Tee",
      "printfulVariantId": "6951cf089ec022",
      "type": "physical"
    },
    {
      "name": "Taurus Recycled Baseball Jersey",
      "variants": [
        { "size": "XS", "variantId": "6951db0b91f1d8", "price": 49.99 },
        { "size": "S", "variantId": "6951db0b91f249", "price": 49.99 },
        { "size": "M", "variantId": "6951db0b91f294", "price": 49.99 },
        { "size": "L", "variantId": "6951db0b91f2d5", "price": 49.99 },
        { "size": "XL", "variantId": "6951db0b91f321", "price": 49.99 },
        { "size": "2XL", "variantId": "6951db0b91f368", "price": 53.99 },
        { "size": "3XL", "variantId": "6951db0b91f3b4", "price": 56.99 }
      ],
      "type": "physical",
      "eco": true
    },
    {
      "name": "Taurus Micro-Rib Tank Top",
      "variants": [
        { "size": "XS", "variantId": "6951c9104965e8", "price": 32.99 },
        { "size": "S", "variantId": "6951c910496649", "price": 32.99 },
        { "size": "M", "variantId": "6951c910496698", "price": 32.99 },
        { "size": "L", "variantId": "6951c9104966d6", "price": 32.99 },
        { "size": "XL", "variantId": "6951c910496729", "price": 32.99 },
        { "size": "2XL", "variantId": "6951c910496768", "price": 34.00 }
      ],
      "type": "physical"
    }
  ]
};

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  if (!sig) {
    console.error('Missing Stripe signature header');
    return { statusCode: 400, body: 'Missing Stripe signature' };
  }

  // Verify Stripe webhook signature
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log('Webhook signature verified successfully');
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    await sendErrorEmail(`Webhook signature verification failed: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle checkout.session.completed event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    console.log('Payment received for session:', session.id);

    try {
      // Get line items with product details
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        expand: ['data.price.product']
      });
      const productName = lineItems.data[0]?.description || '';

      const orderData = {
        sessionId: session.id,
        email: session.customer_details?.email || '',
        name: session.customer_details?.name || '',
        phone: session.customer_details?.phone || '',
        product: productName,
        quantity: lineItems.data[0]?.quantity || 1,
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency?.toUpperCase() || 'USD',
        shipping: session.shipping_details
      };

      // Send notification email immediately
      await sendOrderNotificationEmail(orderData);

      // Check if physical or digital product
      if (isPhysicalProduct(productName)) {
        console.log('Physical product detected - creating Printful order');
        await createPrintfulOrder(orderData);
      } else {
        console.log('Digital product detected - no Printful order needed');
      }
      
      return { statusCode: 200, body: JSON.stringify({ received: true, processed: true }) };
    } catch (error) {
      console.error('Error processing checkout session:', error);
      await sendErrorEmail(`Stripe webhook processing error: ${error.message}\nSession ID: ${session.id}`);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
  }

  // Other event types
  console.log('Received webhook event type:', stripeEvent.type);
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

function isPhysicalProduct(productName) {
  const physicalKeywords = ['hoodie', 'tee', 'shirt', 'crewneck', 'sweatshirt', 'apparel', 'hat', 'cap', 'beanie', 'socks', 'polo', 'tank', 'jersey', 'pyjama', 'crop'];
  const productLower = productName.toLowerCase();
  return physicalKeywords.some(keyword => productLower.includes(keyword));
}

async function createPrintfulOrder(orderData) {
  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  
  if (!PRINTFUL_API_KEY) {
    const error = 'PRINTFUL_API_KEY not configured';
    console.error(error);
    await sendErrorEmail(`${error} - Cannot create Printful order for: ${orderData.product}`);
    return;
  }

  // Find product in mapping
  const product = PRODUCT_MAPPING.products.find(p => 
    orderData.product.toLowerCase().includes(p.name.toLowerCase())
  );
  
  if (!product) {
    const error = `Product not found in mapping: ${orderData.product}`;
    console.error(error);
    await sendErrorEmail(`${error}\nAvailable products: ${PRODUCT_MAPPING.products.map(p => p.name).join(', ')}`);
    return;
  }

  // Determine variant ID
  let variantId;
  if (product.printfulVariantId) {
    variantId = product.printfulVariantId;
  } else if (product.variants && product.variants.length > 0) {
    // For products with multiple variants, use the first one or extract size from product name
    // For now, default to medium if available
    const mediumVariant = product.variants.find(v => v.size === 'M');
    variantId = mediumVariant ? mediumVariant.variantId : product.variants[0].variantId;
    console.log(`Using variant ID: ${variantId} for product: ${product.name}`);
  } else {
    const error = `No variant ID found for product: ${product.name}`;
    console.error(error);
    await sendErrorEmail(error);
    return;
  }

  // Validate shipping details
  if (!orderData.shipping || !orderData.shipping.address) {
    const error = 'Missing shipping address';
    console.error(error);
    await sendErrorEmail(`${error} for order: ${orderData.sessionId}`);
    return;
  }

  const printfulOrder = {
    recipient: {
      name: orderData.name,
      email: orderData.email,
      phone: orderData.phone || '',
      address1: orderData.shipping.address.line1 || '',
      address2: orderData.shipping.address.line2 || '',
      city: orderData.shipping.address.city || '',
      state_code: orderData.shipping.address.state || '',
      country_code: orderData.shipping.address.country || 'US',
      zip: orderData.shipping.address.postal_code || ''
    },
    items: [{
      variant_id: variantId,
      quantity: orderData.quantity
    }]
  };

  console.log('Creating Printful order with data:', JSON.stringify(printfulOrder, null, 2));

  try {
    const response = await fetch('https://api.printful.com/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(printfulOrder)
    });

    const result = await response.json();
    
    if (response.ok && result.code === 200) {
      console.log('Printful order created successfully:', result.result.id);
      await sendSuccessEmail(orderData, result.result.id);
    } else {
      console.error('Printful API error:', JSON.stringify(result, null, 2));
      await sendErrorEmail(`Printful API error: ${JSON.stringify(result)}\nOrder data: ${JSON.stringify(orderData)}`);
    }
  } catch (error) {
    console.error('Error creating Printful order:', error);
    await sendErrorEmail(`Failed to create Printful order: ${error.message}\nProduct: ${orderData.product}`);
  }
}

// Send immediate order notification email to admin
async function sendOrderNotificationEmail(orderData) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured - cannot send notification email');
    return;
  }

  const itemsList = `${orderData.quantity}x ${orderData.product}`;
  const shippingHtml = orderData.shipping ? `
    <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; border-left: 4px solid #2196F3; margin-top: 20px;">
      <h3 style="margin: 0 0 10px; color: #1565C0;">Shipping Address</h3>
      <p style="margin: 0; color: #1565C0;">
        ${orderData.shipping.name}<br>
        ${orderData.shipping.address?.line1 || ''}<br>
        ${orderData.shipping.address?.line2 ? orderData.shipping.address.line2 + '<br>' : ''}
        ${orderData.shipping.address?.city || ''}, ${orderData.shipping.address?.state || ''} ${orderData.shipping.address?.postal_code || ''}<br>
        ${orderData.shipping.address?.country || 'US'}
      </p>
    </div>
  ` : '<p style="color: #dc3545;">⚠️ No shipping address provided</p>';

  const emailHTML = `
  <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background: #f5f5f5;">
    <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #d4af37; padding-bottom: 10px;">🌟 New Order Received</h2>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin-bottom: 10px;"><strong>Customer:</strong> ${orderData.name}</p>
        <p style="margin-bottom: 10px;"><strong>Email:</strong> ${orderData.email}</p>
        <p style="margin-bottom: 10px;"><strong>Phone:</strong> ${orderData.phone || 'Not provided'}</p>
        <p style="margin-bottom: 10px;"><strong>Amount:</strong> $${orderData.amount.toFixed(2)} ${orderData.currency}</p>
        <p style="margin-bottom: 10px;"><strong>Order ID:</strong> ${orderData.sessionId}</p>
      </div>
      
      <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px; color: #856404;">Items Ordered:</h3>
        <p style="color: #856404; margin: 0;">${itemsList}</p>
      </div>
      
      ${shippingHtml}
      
      <div style="margin-top: 30px; padding: 20px; background: #e8f5e9; border-radius: 8px; border-left: 4px solid #4caf50;">
        <p style="color: #2e7d32; font-weight: 600; margin: 0 0 10px;">✓ Webhook received successfully</p>
        <p style="color: #666; margin: 0; font-size: 0.9rem;">
          ${isPhysicalProduct(orderData.product) ? 'Attempting to create Printful order...' : 'Digital product - no Printful order needed'}
        </p>
      </div>
    </div>
  </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `🛒 New Order: ${orderData.name} - $${orderData.amount.toFixed(2)}`,
        html: emailHTML
      })
    });

    if (response.ok) {
      console.log('Order notification email sent to admin');
    } else {
      const error = await response.text();
      console.error('Failed to send order notification email:', error);
    }
  } catch (error) {
    console.error('Error sending order notification email:', error);
  }
}

async function sendSuccessEmail(orderData, printfulOrderId) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `✅ Printful Order Created: ${orderData.product}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">✅ Order Successfully Sent to Printful</h2>
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="margin-bottom: 10px;"><strong>Customer:</strong> ${orderData.name}</p>
              <p style="margin-bottom: 10px;"><strong>Email:</strong> ${orderData.email}</p>
              <p style="margin-bottom: 10px;"><strong>Product:</strong> ${orderData.product}</p>
              <p style="margin-bottom: 10px;"><strong>Printful Order ID:</strong> <code>${printfulOrderId}</code></p>
              <p style="margin-bottom: 10px;"><strong>Amount:</strong> $${orderData.amount.toFixed(2)}</p>
            </div>
            <p style="color: #155724; background: #d4edda; padding: 15px; border-radius: 8px;">
              ✓ Order automatically created in Printful and will be fulfilled automatically.
            </p>
          </div>
        `
      })
    });

    if (response.ok) {
      console.log('Success notification email sent');
    } else {
      console.error('Failed to send success email');
    }
  } catch (error) {
    console.error('Error sending success email:', error);
  }
}

async function sendErrorEmail(errorMessage) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured - cannot send error email');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: '🚨 Stripe Webhook Error',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545; border-bottom: 3px solid #dc3545; padding-bottom: 10px;">🚨 Webhook Processing Error</h2>
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <pre style="white-space: pre-wrap; word-wrap: break-word; color: #721c24;">${errorMessage}</pre>
            </div>
            <p style="color: #721c24; background: #f8d7da; padding: 15px; border-radius: 8px;">
              ⚠️ Please check Netlify function logs and fulfill order manually if needed.
            </p>
            <p style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666;">
              <strong>Next Steps:</strong><br>
              1. Check Netlify function logs for full error details<br>
              2. Verify environment variables are set correctly<br>
              3. Check Stripe dashboard for the order details<br>
              4. Manually create Printful order if needed
            </p>
          </div>
        `
      })
    });

    if (response.ok) {
      console.log('Error notification email sent');
    } else {
      console.error('Failed to send error email');
    }
  } catch (error) {
    console.error('Error sending error email:', error);
  }
}
