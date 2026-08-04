// Lyrīon Atelier — homepage "Customer Favorites" grid.
// Renders into #featured-grid using the same .product-card markup as
// js/shop-page.js's createCard(), so it inherits the shop grid's CSS
// and JS contracts without needing its own styling rules.
const GRID_SELECTOR = '[data-featured-grid]';
const FEATURED_COUNT = 8;

function formatPrice(product) {
  const value = Number(product.price ?? product.price_range?.min ?? 0);
  return Number.isFinite(value) ? `From $${value.toFixed(2)}` : '';
}

function resolveImage(product) {
  return product.mainImage || (Array.isArray(product.images) ? product.images[0] : null) || '/assets/catalog/placeholder.webp';
}

function createCard(product) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.id = product.id || product.slug;
  card.dataset.slug = product.slug || '';

  const img = document.createElement('img');
  img.className = 'product-card-image';
  img.src = resolveImage(product);
  img.alt = product.name || product.title || 'Lyrīon Atelier product';
  img.loading = 'lazy';

  const body = document.createElement('div');
  body.className = 'product-card-content product-card__body';

  const heading = document.createElement('h3');
  heading.className = 'product-card-title product-card__title';
  heading.textContent = product.name || product.title || 'Product';

  const priceEl = document.createElement('p');
  priceEl.className = 'product-card-price product-card__price price';
  priceEl.textContent = formatPrice(product);

  const actions = document.createElement('div');
  actions.className = 'product-card-buttons product-card__actions';
  const viewLink = document.createElement('a');
  viewLink.className = 'view-product-btn view-product-button product-buy-btn';
  viewLink.textContent = 'View Product';
  viewLink.href = product.link || `/product?slug=${product.slug}`;
  actions.append(viewLink);

  body.append(heading, priceEl, actions);
  card.append(img, body);
  return card;
}

async function loadFeaturedProducts() {
  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    let response;
    try {
      response = await fetch('/data/all-products.json', { cache: 'force-cache', signal: ctrl.signal });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) return;
    const catalog = await response.json();
    const items = Array.isArray(catalog) ? catalog : [];
    const featured = items
      .filter((product) => product.state?.published && product.state?.ready)
      .slice(0, FEATURED_COUNT);
    if (!featured.length) return;
    grid.innerHTML = '';
    featured.forEach((product) => grid.append(createCard(product)));
  } catch {
    // Leave the grid empty — the "View All" link above it still works.
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFeaturedProducts);
} else {
  loadFeaturedProducts();
}
