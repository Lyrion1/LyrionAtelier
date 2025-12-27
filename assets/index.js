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

  const pickGallery = (product) => {
    const seeds = [];
    if (product.image) seeds.push(product.image);
    if (Array.isArray(product.images)) seeds.push(...product.images);
    else if (product.images && typeof product.images === 'object') {
      if (product.images.card) seeds.push(product.images.card);
      if (Array.isArray(product.images.gallery)) seeds.push(...product.images.gallery);
    }
    const normalized = seeds.filter(Boolean).map((src) => String(src).replace('_thumb', ''));
    if (!normalized.length) normalized.push('/assets/catalog/placeholder.webp');
    const seed = normalized[0] || '/assets/catalog/placeholder.webp';
    while (normalized.length < 4) normalized.push(seed);
    return normalized.slice(0, 4);
  };

  featured.forEach(product => {
    const title = product.name || product.title || product.slug || 'Product';
    const description = product.description || product.desc || '';
    const displayPrice = extractPrice(product);
    const canAddProduct = canAddToCart && product?.id != null && Number.isFinite(displayPrice);
    const images = pickGallery(product);
    const card = document.createElement('article');
    card.className = 'product-card';
    const media = document.createElement('div');
    media.className = 'product-card__media media';
    const gridEl = document.createElement('div');
    gridEl.className = 'product-card__media-grid';
    let mediaReady = false;
    const markReady = () => {
      if (mediaReady) return;
      mediaReady = true;
      card.classList.add('media-ready');
    };
    images.forEach((src, idx) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${title} image ${idx + 1}`;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = () => { if (img.src !== '/assets/catalog/placeholder.webp') img.src = '/assets/catalog/placeholder.webp'; };
      img.onload = markReady;
      gridEl.appendChild(img);
    });
    media.appendChild(gridEl);

    const body = document.createElement('div');
    body.className = 'product-card__body';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const desc = document.createElement('p');
    desc.className = 'muted';
    desc.textContent = description;
    const price = document.createElement('p');
    price.className = 'price product-card__price';
    price.textContent = Number.isFinite(displayPrice) ? `$${displayPrice.toFixed(2)}` : 'Price unavailable';

    const actions = document.createElement('div');
    actions.className = 'product-card__actions button-row tight';
    const viewLink = document.createElement('a');
    viewLink.className = 'btn btn-outline';
    viewLink.href = detailUrl(product);
    viewLink.textContent = 'View';
    const addButton = document.createElement('button');
    addButton.className = 'btn btn-primary add-to-cart-btn';
    addButton.type = 'button';
    addButton.textContent = 'Add to cart';
    if (!canAddProduct) addButton.disabled = true;

    actions.append(viewLink, addButton);
    body.append(heading, desc, price, actions);
    card.append(media, body);
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, a')) return;
      window.location.href = detailUrl(product);
    });
    grid.appendChild(card);

    if (addButton && canAddProduct) {
      addButton.addEventListener('click', (ev) => {
        ev.stopPropagation();
        addToCart(product.id);
      });
    }
  });
}
