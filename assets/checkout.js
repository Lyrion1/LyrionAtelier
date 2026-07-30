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
const SUPABASE_CHECKOUT_URL = 'https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/create-checkout';

function getCheckoutErrorElement() {
  return document.getElementById('checkout-error');
}

function setCheckoutError(message) {
  const errorEl = getCheckoutErrorElement();
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = message ? 'block' : 'none';
}

async function parseCheckoutError(response) {
  try {
    const data = await response.clone().json();
    return data?.error || data?.message || `Checkout failed (${response.status})`;
  } catch {
    const text = await response.text().catch(() => '');
    return text || `Checkout failed (${response.status})`;
  }
}

const checkoutBtn = document.getElementById('checkoutBtn');
checkoutBtn?.addEventListener('click', async () => {
const cart = JSON.parse(localStorage.getItem('cart')) || [];
const lineItems = window.buildLineItems(); // implement or replace
  setCheckoutError('');
  if (!lineItems || lineItems.length === 0) {
    setCheckoutError('Your cart is empty.');
    return;
  }
  let res;
  try {
    res = await fetch(SUPABASE_CHECKOUT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        basket: cart,
        successUrl: window.location.origin + '/success',
        cancelUrl: window.location.origin + '/cart'
      })
    });
  } catch (fetchErr) {
    setCheckoutError(fetchErr.message || 'Failed to reach checkout service.');
    return;
  }

  if (!res.ok) {
    setCheckoutError(await parseCheckoutError(res));
    return;
  }

  try {
    const { url, error } = await res.json();
    if (error) {
      setCheckoutError(error);
      return;
    }
    if (!url) {
      setCheckoutError('Checkout service did not return a redirect URL.');
      return;
    }
    window.location = url;
  } catch (parseErr) {
    setCheckoutError('Unexpected response from checkout service.');
  }
});
