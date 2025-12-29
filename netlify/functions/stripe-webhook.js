const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const FROM_EMAIL = process.env.ORDER_FROM || 'orders@lyrionatelier.com';

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  if (!sig) {
    return { statusCode: 400, body: 'Missing Stripe signature' };
  }

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;

    console.log('Payment received:', session.id);

    try {
      // Get line items
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const productName = lineItems.data[0]?.description || '';

      const orderData = {
        email: session.customer_details?.email || '',
        name: session.customer_details?.name || '',
        product: productName,
        quantity: lineItems.data[0]?.quantity || 1,
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency,
        shipping: session.shipping_details
      };

      // Check if physical or digital product
      if (isPhysicalProduct(productName)) {
        console.log('Physical product - sending to Printful');
        await createPrintfulOrder(orderData);
      } else {
        console.log('Digital product - sending email notification');
        await sendDigitalOrderEmail(orderData);
      }
    } catch (error) {
      console.error('Error processing checkout session:', error);
      await sendErrorEmail(`Stripe webhook handling error: ${error.message}`);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

function isPhysicalProduct(productName) {
  const physicalKeywords = ['hoodie', 'tee', 'shirt', 'crewneck', 'sweatshirt', 'apparel'];
  return physicalKeywords.some(keyword => 
    productName.toLowerCase().includes(keyword)
  );
}

async function createPrintfulOrder(orderData) {
  const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
  
  // Load product mapping
  let productMapping;
  try {
    const mappingPath = path.join(process.cwd(), 'config', 'printful-products.json');
    const mappingRaw = fs.readFileSync(mappingPath, 'utf8');
    productMapping = JSON.parse(mappingRaw);
  } catch (err) {
    console.error('Unable to load product mapping:', err.message);
    await sendErrorEmail(`Product mapping missing: ${err.message}`);
    return;
  }

  const product = productMapping.products.find(p => 
    orderData.product.toLowerCase().includes(p.name.toLowerCase())
  );
  
  if (!product) {
    console.error('Product not found in mapping:', orderData.product);
    await sendErrorEmail(`Product not mapped: ${orderData.product}`);
    return;
  }

  const printfulOrder = {
    recipient: {
      name: orderData.name,
      email: orderData.email,
      address1: orderData.shipping?.address?.line1 || '',
      address2: orderData.shipping?.address?.line2 || '',
      city: orderData.shipping?.address?.city || '',
      state_code: orderData.shipping?.address?.state || '',
      country_code: orderData.shipping?.address?.country || 'US',
      zip: orderData.shipping?.address?.postal_code || ''
    },
    items: [{
      variant_id: product.printfulVariantId,
      quantity: orderData.quantity
    }]
  };

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
    
    if (result.code === 200) {
      console.log('Printful order created:', result.result.id);
      await sendSuccessEmail(orderData, result.result.id);
    } else {
      console.error('Printful error:', result);
      await sendErrorEmail(`Printful error: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error('Error creating Printful order:', error);
    await sendErrorEmail(`Error: ${error.message}`);
  }
}

async function sendDigitalOrderEmail(orderData) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'your@email.com';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `New Digital Order: ${orderData.product}`,
        html: `
          <h2>New Digital Product Order</h2>
          <p><strong>Customer:</strong> ${orderData.name}</p>
          <p><strong>Email:</strong> ${orderData.email}</p>
          <p><strong>Product:</strong> ${orderData.product}</p>
          <p><strong>Amount:</strong> $${orderData.amount} ${orderData.currency.toUpperCase()}</p>
          <hr>
          <p>Action required: Send digital certificate to customer email.</p>
        `
      })
    });
    console.log('Digital order email sent');
  } catch (error) {
    console.error('Error sending digital order email:', error);
  }
}

async function sendSuccessEmail(orderData, printfulOrderId) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'your@email.com';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: `Order Sent to Printful: ${orderData.product}`,
        html: `
          <h2>Physical Product Order - Sent to Printful</h2>
          <p><strong>Customer:</strong> ${orderData.name}</p>
          <p><strong>Email:</strong> ${orderData.email}</p>
          <p><strong>Product:</strong> ${orderData.product}</p>
          <p><strong>Printful Order ID:</strong> ${printfulOrderId}</p>
          <p><strong>Amount:</strong> $${orderData.amount}</p>
          <hr>
          <p>Order automatically sent to Printful for fulfillment.</p>
        `
      })
    });
  } catch (error) {
    console.error('Error sending success email:', error);
  }
}

async function sendErrorEmail(errorMessage) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'your@email.com';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        subject: 'Printful Order Error',
        html: `
          <h2>Error Processing Order</h2>
          <p>${errorMessage}</p>
          <p>Please check logs and fulfill manually.</p>
        `
      })
    });
  } catch (error) {
    console.error('Error sending error email:', error);
  }
}
