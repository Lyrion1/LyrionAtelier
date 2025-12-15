function buildLineItemsFromCart() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  return cart.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: { name: item.name },
      unit_amount: Math.round(Number(item.price) * 100)
    },
    quantity: item.quantity || 1
  }));
}

window.buildLineItems = window.buildLineItems || buildLineItemsFromCart;

document.getElementById('checkoutBtn').addEventListener('click', async () => {
  // Build your items from the cart UI here
  const lineItems = window.buildLineItems(); // implement or replace
  if (!lineItems || lineItems.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  let res;
  try {
    res = await fetch('/.netlify/functions/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineItems,
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
