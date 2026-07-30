(() => {
  const SUPPORT_EMAIL = 'admin@lyrionatelier.com';
  const CART_KEY = 'cart';
  const reportError = (message) => {
    if (typeof window.showToast === 'function') {
      window.showToast(message, 'error');
      return;
    }
    const status = document.querySelector('.form-status, #checkout-error');
    if (status) {
      status.textContent = message;
      status.style.display = 'block';
    }
  };

  const queueItem = (item) => {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      const nextCart = Array.isArray(cart) ? cart : [];
      nextCart.push(item);
      localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
      return true;
    } catch (error) {
      console.error('[service-checkout] unable to store cart item', error);
      return false;
    }
  };

  async function startPurchase(event) {
    event?.preventDefault?.();
    const button = event?.currentTarget || null;
    if (!button) return;

    const name = button.dataset.name || button.textContent?.trim() || 'Reading';
    const price = button.dataset.price;
    const productType = button.dataset.productType || 'oracle_reading';
    const readingId = button.dataset.readingId || null;
    const certificateTier = button.dataset.certificateTier || null;
    const productId = button.dataset.productId || readingId || certificateTier || null;
    const successUrl = `${window.location.origin}/success`;

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Processing...';

    try {
      const queued = queueItem({
        id: productId || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        slug: productId || readingId || certificateTier || null,
        name,
        price: Number(price),
        size: 'Standard',
        quantity: 1,
        category: productType,
        image: null
      });

      if (!queued) {
        throw new Error('Cart unavailable');
      }
      window.location.href = '/cart';
    } catch (error) {
      console.error('[service-checkout] unable to start purchase', error);
      reportError('Unable to start checkout. Please try again or contact ' + SUPPORT_EMAIL);
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.purchase-reading-button').forEach((btn) => {
      btn.addEventListener('click', startPurchase);
    });
  });
})();
