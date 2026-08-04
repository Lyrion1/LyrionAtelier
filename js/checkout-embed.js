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

  function resolveCheckoutProductId(item) {
    const candidates = [
      item?.slug,
      item?.id,
      item?.productId
    ];
    return candidates
      .map((value) => (value == null ? '' : String(value).trim()))
      .find(Boolean) || '';
  }

  function buildBasket(cart) {
    return cart
      .map((item) => ({
        id: resolveCheckoutProductId(item),
        qty: Number.isFinite(item.quantity) ? item.quantity : Number(item.qty) || 1,
        size: item.size || item.selectedSize || 'Default'
      }))
      .filter((item) => item.id);
  }

  /**
   * Turn the ids the server could not price back into the names the customer
   * actually recognises, using the cart they are looking at.
   */
  function describeUnavailable(unavailable, cart) {
    const nameFor = (id) => {
      const match = cart.find((item) => resolveCheckoutProductId(item) === id);
      return (match && (match.name || match.title)) || id;
    };
    const names = (unavailable || [])
      .map((entry) => nameFor(typeof entry === 'string' ? entry : entry?.id))
      .filter(Boolean);
    if (!names.length) return '';
    const list = names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    const verb = names.length === 1 ? 'is' : 'are';
    return `${list} ${verb} unavailable right now and ${verb === 'is' ? 'was' : 'were'} not included. Everything else in your basket is ready to check out.`;
  }

  function setInlineNotice(message = '') {
    const noticeEl = document.getElementById('checkout-notice');
    if (!noticeEl) return;
    noticeEl.textContent = message;
    noticeEl.style.display = message ? 'block' : 'none';
  }

  function setInlineError(message = '') {
    const errorEl = document.getElementById('checkout-error');
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.style.display = message ? 'block' : 'none';
  }

  // site.json lives at /public/data/site.json in this repo, but this used to
  // request /data/site.json only, which 404s in production. That made the
  // publishable key unreachable, so checkout could not start even once the
  // basket resolved. Both locations are tried, same idiom the checkout Edge
  // Function already uses for products.json.
  const SITE_CONFIG_URLS = ['/public/data/site.json', '/data/site.json'];

  async function loadPublishableKey() {
    let lastStatus = null;
    for (const url of SITE_CONFIG_URLS) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      let response;
      try {
        response = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          throw new Error('Configuration request timed out. Please try again.');
        }
        continue;
      }
      clearTimeout(timer);
      if (!response.ok) {
        lastStatus = response.status;
        continue;
      }
      const data = await response.json().catch(() => ({}));
      if (data?.stripePublishableKey) return data.stripePublishableKey;
      lastStatus = 'missing key';
    }
    throw new Error(`Failed to load payment configuration (${lastStatus ?? 'unreachable'}).`);
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
      const cart = readCart();
      const basket = buildBasket(cart);
      if (!basket.length) {
        throw new Error('Your cart is empty.');
      }

      const payload = {
        basket,
        discountCode: readDiscountCode()
      };

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      let response;
      try {
        response = await fetch(CREATE_CHECKOUT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: ctrl.signal
        });
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          throw new Error('Checkout request timed out. Please try again.');
        }
        throw new Error('Network error during checkout. Please check your connection and try again.');
      }
      clearTimeout(timer);

      const data = await response.json().catch(() => ({}));
      console.log('[checkout-embed] create-checkout response', data);

      if (!response.ok) {
        const detail = describeUnavailable(data?.unavailable, cart);
        throw new Error(detail || data?.error || `Checkout request failed (${response.status})`);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.clientSecret) {
        throw new Error('Missing client secret.');
      }

      // Some lines could not be priced, but the rest of the order is valid:
      // name them for the customer and carry on to payment.
      setInlineNotice(describeUnavailable(data?.unavailable, cart));

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
