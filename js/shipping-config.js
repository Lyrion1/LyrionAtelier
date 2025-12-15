(function(global) {
  const SHIPPING_THRESHOLD = 50;
  const SHIPPING_COST = 5.99;
  const ALLOWED_ORIGINS = [
    'https://lyrionatelier.com',
    'https://www.lyrionatelier.com',
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHIPPING_THRESHOLD, SHIPPING_COST, ALLOWED_ORIGINS };
  }

  if (global) {
    global.shippingConfig = { SHIPPING_THRESHOLD, SHIPPING_COST, ALLOWED_ORIGINS };
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this);
