const reportOracleCheckout = (message) => {
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'error');
  }
};

async function bookOracleReading(event = null) {
  const evt = event || (typeof window !== 'undefined' ? window.event : null);
  const button = evt?.currentTarget || evt?.target || null;
  const readingName = button?.dataset?.name || '';
  const readingPrice = button?.dataset?.price || '';
  const readingId = button?.dataset?.readingId || null;
  const originalText = button ? button.textContent : null;

  if (button) {
    evt?.preventDefault?.();
    button.textContent = 'Processing...';
    button.disabled = true;
  }

  if (!readingName || !readingPrice) {
    console.error('Missing reading data', { readingName, readingPrice });
    reportOracleCheckout('Unable to start checkout. Please refresh and try again or contact admin@lyrionatelier.com.');
    if (button && originalText) {
      button.textContent = originalText;
      button.disabled = false;
    }
    return;
  }

  if (typeof window.queueCheckoutItem !== 'function') {
    reportOracleCheckout('Payment system is temporarily unavailable. Please refresh and try again or contact admin@lyrionatelier.com.');
    if (button && originalText) {
      button.textContent = originalText;
      button.disabled = false;
    }
    return;
  }

  const queued = window.queueCheckoutItem({
    id: readingId || readingName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    slug: readingId || null,
    name: readingName,
    price: Number(readingPrice),
    size: 'Standard',
    quantity: 1,
    category: 'oracle_reading',
    image: null
  });

  if (!queued?.ok && button && originalText) {
    button.textContent = originalText;
    button.disabled = false;
    return;
  }
  window.location.href = '/cart';
}
