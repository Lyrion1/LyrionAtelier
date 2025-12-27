(() => {
  const SUPPORT_EMAIL = 'admin@lyrionatelier.com';

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
      if (typeof window.initiateCheckout !== 'function') {
        throw new Error('Checkout unavailable');
      }

      const ok = await window.initiateCheckout({
        name,
        price,
        type: productType,
        readingId,
        certificateTier,
        productId,
        successUrl
      });

      if (!ok) {
        throw new Error('Checkout failed to start');
      }
    } catch (error) {
      console.error('[service-checkout] unable to start purchase', error);
      alert('Unable to start checkout. Please try again or contact ' + SUPPORT_EMAIL);
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
