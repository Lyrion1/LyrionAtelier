window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX');

document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  renderFeaturedProducts();
});

function renderFeaturedProducts() {
  if (typeof products === 'undefined') return;
  const catalog = Array.isArray(products) ? products.filter(Boolean) : [];
  const curated = catalog.filter((p) => p.showOnHomepage);
  const bestsellers = catalog.filter((p) => p.isBestseller);
  const primary = curated.length ? curated : (bestsellers.length ? bestsellers : catalog);
  const slugify = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const productSlug = (product) => product?.slug || (product?.title ? slugify(product.title) : product?.name ? slugify(product.name) : null);
  const detailUrl = (product) => {
    const slug = productSlug(product);
    if (slug) return `/product.html?slug=${encodeURIComponent(slug)}`;
    if (product?.id != null) return `/product.html?id=${encodeURIComponent(product.id)}`;
    return '/shop.html';
  };
  const pickFeatured = (pool) => {
    const selections = pool.filter((p) => productSlug(p)).slice(0, 4);
    if (selections.length < 4) {
      const seen = new Set(selections.map((p) => productSlug(p)));
      selections.push(...catalog.filter((p) => productSlug(p) && !seen.has(productSlug(p))).slice(0, 4 - selections.length));
    }
    return selections;
  };
  const featured = pickFeatured(primary);
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  const canAddToCart = typeof addToCart === 'function';
  if (!canAddToCart) {
    console.error('addToCart is not available; cannot bind featured product buttons.');
    return;
  }

  featured.forEach(product => {
    const title = product.name || product.title || product.slug || 'Product';
    const description = product.description || product.desc || '';
    const priceValue = typeof product.price === 'number'
      ? product.price
      : Number(product.price?.min ?? product.price?.amount ?? 0);
    const displayPrice = Number.isFinite(priceValue) ? priceValue : 0;
    const imageSrc = product.image || (Array.isArray(product.images) ? product.images[0] : null);
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-image">
        ${imageSrc ? `<img src="${imageSrc}" alt="${title}" loading="lazy">` : `<div class="placeholder">✨</div>`}
      </div>
      <div>
        <h3>${title}</h3>
        <p class="muted">${description}</p>
        <p class="price">$${displayPrice.toFixed(2)}</p>
      </div>
      <div class="button-row tight">
        <a class="btn btn-outline" href="${detailUrl(product)}">View</a>
        <button class="btn btn-primary add-to-cart-btn" type="button">Add to cart</button>
      </div>
    `;
    grid.appendChild(card);

    const addButton = card.querySelector('.add-to-cart-btn');
    if (addButton && canAddToCart) {
      addButton.addEventListener('click', () => addToCart(product.id));
    }
  });
}
