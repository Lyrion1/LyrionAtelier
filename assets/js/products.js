const ensureGlobal = () => {
  if (typeof window === 'undefined') return {};
  window.LyrionAtelier = window.LyrionAtelier || {};
  return window.LyrionAtelier;
};

const existingProducts = () => {
  const global = ensureGlobal();
  return Array.isArray(global.products) && global.products.length ? global.products : null;
};

async function loadCatalog() {
  try {
    const res = await fetch('/data/all-products.json', { cache: 'no-store' });
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      const global = ensureGlobal();
      global.products = data;
      return data;
    }
  } catch (err) {
    console.warn('[catalog] failed to load /data/all-products.json', err);
  }
  return null;
}

async function loadFallback() {
  try {
    await import('/js/products.js');
  } catch (err) {
    console.warn('[catalog] fallback products failed', err);
  }
  const global = ensureGlobal();
  return Array.isArray(global.products) ? global.products : [];
}

export const productsReady = (async () => {
  const existing = existingProducts();
  if (existing) return existing;
  const catalog = await loadCatalog();
  if (catalog && catalog.length) return catalog;
  return loadFallback();
})();
