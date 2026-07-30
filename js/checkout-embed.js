/**
 * checkout-embed.js
 * Wires the "Pay now" button to the Supabase create-checkout Edge Function
 * and mounts Stripe Embedded Checkout inside #embedded-checkout.
 *
 * Cart persists in sessionStorage (key: lyrion_cart).
 * Discount code is read from localStorage (key: lyrion_wheel_discount).
 *
 * Requires: Stripe.js loaded from https://js.stripe.com/v3/
 * Stripe publishable key is fetched from /public/data/site.json — never hardcoded.
 */

(function () {
  'use strict';

  const SUPABASE_FUNCTIONS_BASE = 'https://zqomzteaeiqtnipkgyuo.supabase.co/functions/v1';
  const CART_KEY = 'lyrion_cart';
  const DISCOUNT_KEY = 'lyrion_wheel_discount';

  /** Read the cart from sessionStorage. Returns an array of basket items. */
  function getCart() {
    try {
      return JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  }

  /** Read a won discount code from the wheel prize stored in localStorage. */
  function getDiscountCode() {
    try {
      const raw = localStorage.getItem(DISCOUNT_KEY);
      if (!raw) return null;
      const prize = JSON.parse(raw);
      // Only pass monetary discount types (percent or fixed)
      if (prize && (prize.type === 'discount' || prize.type === 'fixed')) {
        // Check expiry
        if (prize.expiry && new Date(prize.expiry) < new Date()) return null;
        return prize.code || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  /** Load the Stripe publishable key from /public/data/site.json */
  async function loadStripeKey() {
    const resp = await fetch('/public/data/site.json');
    if (!resp.ok) throw new Error('Could not load site.json');
    const data = await resp.json();
    if (!data.stripePublishableKey || data.stripePublishableKey === 'pk_live_REPLACE_ME') {
      throw new Error('Stripe publishable key is not configured');
    }
    return data.stripePublishableKey;
  }

  /** Dynamically load Stripe.js if not already present */
  async function loadStripeJs(publishableKey) {
    if (window.Stripe) return window.Stripe(publishableKey);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = () => resolve(window.Stripe(publishableKey));
      script.onerror = () => reject(new Error('Failed to load Stripe.js'));
      document.head.appendChild(script);
    });
  }

  /** Map the cart (array of {id, qty, size}) into the basket format the Edge Function expects */
  function buildBasket(cart) {
    return cart.map((item) => ({
      id: item.id || item.productId,
      qty: item.quantity || item.qty || 1,
      size: item.size || item.selectedSize || undefined,
    }));
  }

  /** Show an error message in the checkout area */
  function showCheckoutError(message) {
    const mount = document.getElementById('embedded-checkout');
    if (mount) {
      mount.innerHTML = '<p style="color:#f87171;padding:1rem 0;">' + message + '</p>';
    }
    const btn = document.getElementById('checkoutBtn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Try again';
    }
  }

  /** Main: mount Stripe Embedded Checkout */
  async function mountEmbeddedCheckout() {
    const btn = document.getElementById('checkoutBtn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Loading…';
    }

    try {
      const cart = getCart();
      if (!cart || cart.length === 0) {
        showCheckoutError('Your cart is empty.');
        return;
      }

      const basket = buildBasket(cart);
      const discountCode = getDiscountCode();

      // Fetch client secret from Supabase Edge Function
      const resp = await fetch(SUPABASE_FUNCTIONS_BASE + '/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ basket, discountCode }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Checkout creation failed');
      }

      const { clientSecret } = await resp.json();
      if (!clientSecret) throw new Error('No client secret returned');

      // Load Stripe publishable key and initialise Stripe.js
      const publishableKey = await loadStripeKey();
      const stripe = await loadStripeJs(publishableKey);

      // Mount Embedded Checkout
      const checkout = await stripe.initEmbeddedCheckout({ clientSecret });
      const mount = document.getElementById('embedded-checkout');
      if (!mount) throw new Error('No #embedded-checkout element found');

      // Hide the legacy checkout form
      const legacyGrid = document.querySelector('.checkout-grid');
      if (legacyGrid) legacyGrid.style.display = 'none';
      const cartTable = document.querySelector('.cart-table');
      if (cartTable) cartTable.closest('.card')?.style && (cartTable.closest('.card').style.display = 'none');

      checkout.mount(mount);

      if (btn) btn.style.display = 'none';
    } catch (err) {
      console.error('[checkout-embed]', err);
      showCheckoutError(
        'Payment could not be initialised. Please refresh and try again.',
      );
    }
  }

  // Wire the Pay now button
  document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('checkoutBtn');
    if (btn) {
      btn.addEventListener('click', mountEmbeddedCheckout);
    }
  });
})();
