function buildLineItemsFromCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  return cart
    .filter(item => {
      const price = parseFloat(item?.price);
      return item && item.name && typeof item.name === 'string' && !Number.isNaN(price) && price > 0;
    })
    .map(item => ({
      price_data: {
        currency: 'usd',
        product_data: { name: item.size ? `${item.name} • ${item.size}` : item.name },
        unit_amount: Math.round(parseFloat(item.price) * 100)
      },
      quantity: item.quantity || 1
    }));
}

window.buildLineItems = window.buildLineItems || buildLineItemsFromCart;

function resolveBundlePayload(cart = []) {
  if (typeof window.evaluateBundleDiscount === 'function') {
    const result = window.evaluateBundleDiscount(cart);
    return {
      id: result?.selectedBundle?.id || null,
      label: result?.selectedBundle?.label || null,
      savingsCents: result?.savingsCents || 0
    };
  }
  return { id: null, label: null, savingsCents: 0 };
}

const checkoutBtn = document.getElementById('checkoutBtn');
checkoutBtn?.addEventListener('click', async () => {
const cart = JSON.parse(localStorage.getItem('cart')) || [];
const lineItems = window.buildLineItems(); // implement or replace
  if (!lineItems || lineItems.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  const bundle = resolveBundlePayload(cart);
  let res;
  try {
    res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineItems,
        bundle,
        successUrl: window.location.origin + '/success',
        cancelUrl: window.location.origin + '/cart'
      })
    });
  } catch (fetchErr) {
    alert(fetchErr.message || 'Failed to reach checkout service.');
    return;
  }

  if (!res.ok) {
    alert('Failed to create checkout session.');
    return;
  }

  try {
    const { url, error } = await res.json();
    if (error) {
      alert(error);
      return;
    }
    window.location = url;
  } catch (parseErr) {
    alert('Unexpected response from checkout service.');
  }
});
