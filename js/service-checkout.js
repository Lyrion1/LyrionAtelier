(() => {
  const SUPPORT_EMAIL = 'admin@lyrionatelier.com';
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

  async function startPurchase(event) {
    event?.preventDefault?.();
    const button = event?.currentTarget || null;
    if (!button) return;

    const name = button.dataset.name || button.textContent?.trim() || 'Reading';
    const price = button.dataset.price;
    const productType = button.dataset.productType || 'oracle_reading';
    const readingId = button.dataset.readingId || null;
    const productId = button.dataset.productId || readingId || null;
    const normalizedId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Processing...';

    try {
      if (typeof window.queueCheckoutItem !== 'function') {
        throw new Error('Cart unavailable');
      }

      const queued = window.queueCheckoutItem({
        id: productId || normalizedId,
        slug: productId || readingId || normalizedId,
        name,
        price: Number(price),
        size: 'Standard',
        quantity: 1,
        category: productType,
        image: null
      });

      if (!queued?.ok) {
        throw new Error('Unable to queue cart item');
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
