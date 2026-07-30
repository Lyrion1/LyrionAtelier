const CART_KEY = 'cart';
const reportOracleCheckout = (message) => {
  if (typeof window.showToast === 'function') {
    window.showToast(message, 'error');
  }
};

function queueOracleItem(item) {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    const nextCart = Array.isArray(cart) ? cart : [];
    nextCart.push(item);
    localStorage.setItem(CART_KEY, JSON.stringify(nextCart));
    return true;
  } catch (error) {
    console.error('[oracle-checkout] unable to store cart item', error);
    return false;
  }
}

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

  const queued = queueOracleItem({
    id: readingId || readingName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    slug: readingId || null,
    name: readingName,
    price: Number(readingPrice),
    size: 'Standard',
    quantity: 1,
    category: 'oracle_reading',
    image: null
  });

  if (!queued && button && originalText) {
    button.textContent = originalText;
    button.disabled = false;
    return;
  }
  window.location.href = '/cart';
}
