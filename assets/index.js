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
  const slugifyFn = typeof slugify === 'function' ? slugify : null;
  /**
   * Resolve a stable slug for a product using existing slug, title, or name.
   * @param {any} product - product candidate
   * @returns {string|null} normalized slug or null when unavailable
   */
  const productSlug = (product) => {
    if (product?.slug) return product.slug;
    if (slugifyFn && product?.title) return slugifyFn(product.title);
    if (slugifyFn && product?.name) return slugifyFn(product.name);
    return null;
  };
  const detailUrl = (product) => {
    const slug = productSlug(product);
    if (slug) return `/product.html?slug=${encodeURIComponent(slug)}`;
    if (product?.id != null) return `/product.html?id=${encodeURIComponent(product.id)}`;
    return '/shop.html';
  };
  /**
   * Normalize a product price value from diverse product shapes.
   * @param {any} product - product candidate
   * @returns {number} numeric price (defaults to 0 when unavailable)
   */
  const extractPrice = (product) => {
    if (typeof product?.price === 'number') return product.price;
    const min = product?.price?.min ?? product?.price?.amount ?? null;
    if (typeof min === 'number') return min;
    return 0;
  };
  const pickFeatured = (pool) => {
    const withSlugs = pool.reduce((list, product) => {
      const slug = productSlug(product);
      if (slug) list.push({ product, slug });
      return list;
    }, []);
    const selections = withSlugs.slice(0, 4);
    if (selections.length < 4) {
      const seen = new Set(selections.map((item) => item.slug));
      const needed = 4 - selections.length;
      const extras = [];
      for (const product of catalog) {
        if (extras.length >= needed) break;
        const slug = productSlug(product);
        if (slug && !seen.has(slug)) {
          extras.push({ product, slug });
        }
      }
      selections.push(...extras);
    }
    return selections.map((item) => item.product);
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
    const displayPrice = extractPrice(product);
    const imageSrc = product.image || (Array.isArray(product.images) ? product.images[0] : null);
    const canAddProduct = canAddToCart && product?.id != null && Number.isFinite(displayPrice);
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
        <button class="btn btn-primary add-to-cart-btn" type="button" ${canAddProduct ? '' : 'disabled'}>Add to cart</button>
      </div>
    `;
    grid.appendChild(card);

    const addButton = card.querySelector('.add-to-cart-btn');
    if (addButton && canAddProduct) {
      addButton.addEventListener('click', () => addToCart(product.id));
    }
  });
}
