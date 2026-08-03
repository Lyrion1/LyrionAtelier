(function () {
  'use strict';

  const CREATE_CHECKOUT_URL = 'https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1/create-checkout';
  const CART_KEY = 'cart';
  const DISCOUNT_KEY = 'lyrion_wheel_discount';
  let embeddedCheckout = null;

  function readCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch {
      return [];
    }
  }

  function readDiscountCode() {
    try {
      const raw = localStorage.getItem(DISCOUNT_KEY);
      if (!raw) return '';
      const prize = JSON.parse(raw);
      if (!prize?.code) return '';
      if (prize.expiry && new Date(prize.expiry) < new Date()) return '';
      return prize.code;
    } catch {
      return '';
    }
  }

  function buildBasket(cart) {
    return cart
      .map((item) => ({
        id: item.id || item.productId || item.slug || '',
        qty: Number.isFinite(item.quantity) ? item.quantity : Number(item.qty) || 1,
        size: item.size || item.selectedSize || 'Default'
      }))
      .filter((item) => item.id);
  }

  function setInlineError(message = '') {
    const errorEl = document.getElementById('checkout-error');
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = message ? 'block' : 'none';
  }

  async function loadPublishableKey() {
    const response = await fetch('/public/data/site.json', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.stripePublishableKey) {
      throw new Error('Missing Stripe publishable key');
    }
    return data.stripePublishableKey;
  }

  /**
   * Stripe.js loads with `async`, so it may not be ready the instant the
   * checkout button is clicked. Poll briefly rather than assuming
   * window.Stripe exists, and fail with a clear message (not a raw
   * TypeError, not a silent hang) if it genuinely never arrives.
   */
  function waitForStripe(timeoutMs = 8000) {
    if (typeof window.Stripe === 'function') return Promise.resolve(window.Stripe);
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (typeof window.Stripe === 'function') {
          resolve(window.Stripe);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error('Payment system failed to load. Please refresh the page and try again, or disable any ad blocker for this site.'));
          return;
        }
        setTimeout(check, 150);
      };
      check();
    });
  }

  async function startEmbeddedCheckout() {
    const checkoutButton = document.getElementById('checkoutBtn');
    const mountPoint = document.getElementById('embedded-checkout');

    if (!checkoutButton || !mountPoint) return;
    if (embeddedCheckout) return;

    checkoutButton.disabled = true;
    checkoutButton.textContent = 'Loading…';
    setInlineError('');

    try {
      const basket = buildBasket(readCart());
      if (!basket.length) {
        throw new Error('Your cart is empty.');
      }

      const payload = {
        basket,
        discountCode: readDiscountCode()
      };

      const response = await fetch(CREATE_CHECKOUT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      console.log('[checkout-embed] create-checkout response', data);

      if (data?.error) {
        setInlineError(data.error);
        return;
      }

      if (!response.ok) {
        throw new Error(`Checkout request failed (${response.status})`);
      }

      if (!data?.clientSecret) {
        throw new Error('Missing client secret.');
      }

      const [publishableKey, Stripe] = await Promise.all([loadPublishableKey(), waitForStripe()]);
      const stripe = Stripe(publishableKey);
      embeddedCheckout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });

      mountPoint.style.display = 'block';
      embeddedCheckout.mount('#embedded-checkout');
      checkoutButton.style.display = 'none';
    } catch (error) {
      console.error('[checkout-embed]', error);
      setInlineError(error.message || 'Unable to start checkout.');
      embeddedCheckout = null;
    } finally {
      if (checkoutButton.style.display !== 'none') {
        checkoutButton.disabled = false;
        checkoutButton.textContent = 'Checkout';
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const checkoutButton = document.getElementById('checkoutBtn');
    checkoutButton?.addEventListener('click', startEmbeddedCheckout);
  });
})();
