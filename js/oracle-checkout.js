console.log('Oracle checkout script loaded');

async function bookOracleReading(event = null) {
  const evt = event || (typeof window !== 'undefined' ? window.event : null);
  const button = evt?.currentTarget || evt?.target || null;
  const readingName = button?.dataset?.name || '';
  const readingPrice = button?.dataset?.price || '';
  const originalText = button ? button.textContent : null;

  if (button) {
    evt?.preventDefault?.();
    button.textContent = 'Processing...';
    button.disabled = true;
  }

  if (typeof window.initiateCheckout !== 'function') {
    console.error('Checkout handler missing');
    alert('Payment system is temporarily unavailable. Please refresh and try again or contact admin@lyrionatelier.com.');
    if (button && originalText) {
      button.textContent = originalText;
      button.disabled = false;
    }
    return;
  }

  if (!readingName || !readingPrice) {
    console.error('Missing reading data', { readingName, readingPrice });
    alert('Unable to start checkout. Please refresh and try again or contact admin@lyrionatelier.com.');
    if (button && originalText) {
      button.textContent = originalText;
      button.disabled = false;
    }
    return;
  }

  const success = await window.initiateCheckout({
    name: readingName,
    price: readingPrice,
    type: 'oracle_reading'
  });

  if (!success && button && originalText) {
    button.textContent = originalText;
    button.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  console.log('Oracle checkout ready');
});
