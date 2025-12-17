console.log('Universal checkout handler loaded');

const stripe = (typeof Stripe === 'function' && window?.STRIPE_PUBLISHABLE_KEY)
  ? Stripe(window.STRIPE_PUBLISHABLE_KEY)
  : null; // TODO: Provide Stripe publishable key via window.STRIPE_PUBLISHABLE_KEY (set from site config or embed script)
if (!stripe) {
  console.warn('Stripe publishable key missing; skipping client initialization.');
} else {
  try {
    window.stripe = stripe;
    console.log('Stripe initialized');
  } catch (error) {
    console.error('Stripe initialization failed:', error);
  }
}

// Universal function to handle checkout for any product
async function initiateCheckout(productData) {
  const { name, price, type, variantId } = productData;
  
  console.log('Initiating checkout:', productData);
  
  if (!name || !price) {
    console.error('Missing required product data');
    alert('Error: Product information missing. Please refresh and try again.');
    return false;
  }
  
  try {
    const response = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productName: name,
        productPrice: parseFloat(price),
        productType: type || 'oracle_reading',
        variantId: variantId || null
      })
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    if (!data.url) {
      throw new Error('No checkout URL received');
    }
    
    console.log('Redirecting to Stripe Checkout:', data.url);
    window.location.href = data.url;
    return true;
    
  } catch (error) {
    console.error('Checkout error:', error);
    alert('Unable to start checkout. Please try again or contact admin@lyrionatelier.com\n\nError: ' + error.message);
    return false;
  }
}

// Make function globally available
window.initiateCheckout = initiateCheckout;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Checkout handler ready');
});
