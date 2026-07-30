(function () {
  const hasOwn = typeof window.initiateCheckout === 'function' || typeof window.buildLineItems === 'function';
  const notify = (message, type = 'error') => {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    const errorEl = document.getElementById('checkout-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = message ? 'block' : 'none';
    }
  };

  async function start(items) {
    const origin = window.location.origin;
    try {
      const res = await fetch('https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin, items })
      });
      const data = await res.json();
      if (data?.url) {
        location.href = data.url;
        return;
      }
      notify(data?.error || 'Could not start checkout.');
    } catch (e) {
      notify('Network error.');
    }
  }

  if (hasOwn) return;

  document.addEventListener('cart:checkout', (e) => {
    const items = e.detail && Array.isArray(e.detail.items) ? e.detail.items : [];
    if (items.length) start(items);
  });

  function readCart() {
    try {
      const stored = localStorage.getItem('cart');
      const parsed = stored ? JSON.parse(stored) : [];
      const source = Array.isArray(parsed) && parsed.length ? parsed : window.CART || [];
      return Array.isArray(source)
        ? source.map((i) => ({
            title: i.title || i.name,
            sku: i.sku,
            price: i.price,
            quantity: i.quantity || 1,
            image: i.image
          }))
        : [];
    } catch {
      return [];
    }
  }

  function hookButton() {
    const btn = document.getElementById('checkoutBtn');
    if (!btn) return;
    if (btn.dataset.lyrionHooked === '1') return;
    btn.dataset.lyrionHooked = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const items = readCart();
      if (!items.length) {
        notify('Cart is empty.', 'info');
        return;
      }
      start(items);
    });
  }

  if (document.readyState !== 'loading') hookButton();
  else document.addEventListener('DOMContentLoaded', hookButton);
})();
