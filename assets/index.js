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
  const aquariusIndex = curated.findIndex((p) => p.slug === 'aquarius-crop-hoodie');
  const youthAriesIndex = curated.findIndex((p) => p.slug === 'youth-aries-heavy-blend-hoodie');
  if (aquariusIndex !== -1 && youthAriesIndex !== -1) {
    [curated[aquariusIndex], curated[youthAriesIndex]] = [curated[youthAriesIndex], curated[aquariusIndex]];
  }
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
    if (product?.link) return product.link;
    const slug = productSlug(product);
    if (slug) return `/shop/${encodeURIComponent(slug)}.html`;
    if (product?.id != null) return `/shop/${encodeURIComponent(product.id)}.html`;
    return '/shop';
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
    // Specific Valentine's Day homepage products in exact order
    const valentinesSlugs = [
      'heartbeat-hoodie-his',
      'heartbeat-hoodie-hers',
      'mercury-retrograde-hoodie',
      'gemini-love-language-hoodie',
      'single-cosmic-design-mug',
      'virgo-round-mousepad'
    ];
    
    const selections = [];
    const slugMap = new Map();
    
    // Build a map of slug -> product for quick lookup
    for (const product of pool) {
      const slug = productSlug(product);
      if (slug) slugMap.set(slug, product);
    }
    
    // Also check the full catalog for products not in the filtered pool
    for (const product of catalog) {
      const slug = productSlug(product);
      if (slug && !slugMap.has(slug)) slugMap.set(slug, product);
    }
    
    // Pick products in the exact order specified
    for (const slug of valentinesSlugs) {
      const product = slugMap.get(slug);
      if (product) selections.push(product);
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
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id || productSlug(product) || '';
    
    // Create image container for badges overlay
    const imageContainer = document.createElement('div');
    imageContainer.className = 'product-card-image-container';
    
    const coverImage = images.find(Boolean) || '/assets/catalog/placeholder.webp';
    const img = document.createElement('img');
    img.src = coverImage;
    img.alt = `${title} image`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'product-card-image';
    img.onerror = () => {
      if (img.src !== '/assets/catalog/placeholder.webp') {
        img.src = '/assets/catalog/placeholder.webp';
      }
    };
    
    imageContainer.appendChild(img);
    
    // Add Best Seller badge if present
    if (product.bestSellerBadge) {
      const bestSellerBadge = document.createElement('span');
      bestSellerBadge.className = 'product-badge product-badge--bestseller';
      bestSellerBadge.textContent = product.bestSellerBadge;
      imageContainer.appendChild(bestSellerBadge);
    }

    const body = document.createElement('div');
    body.className = 'product-card-content';
    const heading = document.createElement('h3');
    heading.className = 'product-card-title product-card__title';
    heading.textContent = title;
    const desc = document.createElement('p');
    desc.className = 'product-card-description';
    desc.textContent = description;
    const price = document.createElement('p');
    price.className = 'product-card-price product-card__price price';
    price.textContent = Number.isFinite(displayPrice) ? `$${displayPrice.toFixed(2)}` : 'Price unavailable';
    
    // Add scarcity badge if present
    if (product.scarcityBadge) {
      const scarcityBadge = document.createElement('span');
      scarcityBadge.className = 'product-badge product-badge--scarcity';
      scarcityBadge.textContent = product.scarcityBadge;
      body.appendChild(scarcityBadge);
    }

    const actions = document.createElement('div');
    actions.className = 'product-card-buttons';
    const viewLink = document.createElement('a');
    viewLink.className = 'view-product-button view-button product-buy-btn';
    viewLink.href = detailUrl(product);
    viewLink.textContent = 'View Product';
    viewLink.setAttribute('aria-label', 'View');
    viewLink.dataset.slug = productSlug(product) || '';
    const addButton = document.createElement('button');
    addButton.className = 'add-to-cart-button add-to-cart-btn';
    addButton.type = 'button';
    addButton.textContent = 'Add to Cart';
    addButton.dataset.productId = (productSlug(product) || product.id || '').toString();
    if (!canAddProduct) addButton.disabled = true;

    actions.append(viewLink, addButton);
    body.append(heading, desc, price, actions);
    card.append(imageContainer, body);
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, a')) return;
      window.location.href = detailUrl(product);
    });
    grid.appendChild(card);

    if (addButton && canAddProduct) {
      addButton.addEventListener('click', (ev) => {
        ev.stopPropagation();
        addToCart(addButton.dataset.productId || product.id, null, 1, product);
      });
    }
  });
}
