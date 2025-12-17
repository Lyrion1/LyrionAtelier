import { isSellable } from '/lib/catalog.js';

let __ITEMS = [];

async function loadIndex() {
  try {
    const response = await fetch('/data/index.json', { cache: 'no-store' });
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function loadProd(slug) {
  try {
    const response = await fetch(`/data/products/${slug}.json`, { cache: 'no-store' });
    return await response.json();
  } catch {
    return null;
  }
}

function money(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function card(product) {
  const anchor = document.createElement('a');
  anchor.className = 'shop-card';
  anchor.href = '/product/' + product.slug;

  const imgSrc = (product.images || [])[0] || 'https://source.unsplash.com/600x600/?stars,night';
  const imgWrapper = document.createElement('div');
  imgWrapper.className = 'shop-img';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = product.title || '';
  img.src = imgSrc;
  imgWrapper.appendChild(img);

  const meta = document.createElement('div');
  meta.className = 'shop-meta';

  const title = document.createElement('div');
  title.className = 'shop-title';
  title.textContent = product.title || '';

  const sub = document.createElement('div');
  sub.className = 'shop-sub';
  sub.textContent = (product.collection || '').replace(/-/g, ' ');

  const price = document.createElement('div');
  price.className = 'shop-price';
  const priceValue = product.variants?.[0]?.price;
  price.textContent = Number.isFinite(priceValue) ? money(priceValue) : 'Price unavailable';

  meta.appendChild(title);
  meta.appendChild(sub);
  meta.appendChild(price);

  anchor.appendChild(imgWrapper);
  anchor.appendChild(meta);
  return anchor;
}

function render(list) {
  const root = document.getElementById('shop-grid');
  if (!root) return;
  root.innerHTML = '';
  root.classList.add('shop-grid');
  list.forEach(p => root.appendChild(card(p)));
}

function renderEmpty() {
  const root = document.getElementById('shop-grid');
  if (!root) return;
  root.innerHTML = '';
  const cardEl = document.createElement('div');
  cardEl.className = 'shop-empty card';
  const body = document.createElement('div');
  body.className = 'card__body';
  const title = document.createElement('h4');
  title.textContent = 'We’re aligning the stars ✨';
  const desc = document.createElement('p');
  desc.textContent = 'Catalog is updating. Check back in a moment.';
  body.appendChild(title);
  body.appendChild(desc);
  cardEl.appendChild(body);
  root.appendChild(cardEl);
}

function renderFiltered(list) {
  const isEmpty = !list.length;
  if (isEmpty) {
    renderEmpty();
    return;
  }
  render(list);
}

/**
 * Safely apply a filter/transform function to items.
 * Ensures an array is returned and logs any errors or unexpected results.
 * @param {Array} items - Source collection to transform.
 * @param {(items: Array) => any} applyFn - Function to apply to items.
 * @returns {Array} Filtered or transformed array (empty on failure).
 */
function safeApply(items, applyFn) {
  try {
    const res = applyFn(items);
    if (!Array.isArray(res)) {
      console.warn('[shop-grid] filter application returned non-array; defaulting to empty list.');
      return [];
    }
    return res;
  } catch (error) {
    console.error('[shop-grid] filter application failed:', error);
    return [];
  }
}

async function init() {
  const root = document.getElementById('shop-grid');
  if (!root) return;
  const slugs = await loadIndex();
  __ITEMS = (await Promise.all(slugs.map(loadProd))).filter(Boolean).filter(isSellable);
  try { const m = await import('/assets/shop-filters.js'); m.mountFilters(__ITEMS); } catch (_) { }
  const apply = window.__LYRION_FILTERS?.apply?.bind(window.__LYRION_FILTERS) || ((x) => x);
  renderFiltered(safeApply(__ITEMS, apply));
  document.addEventListener('filters:change', () => {
    renderFiltered(safeApply(__ITEMS, apply));
  });
}

document.readyState !== 'loading' ? init() : document.addEventListener('DOMContentLoaded', init);
