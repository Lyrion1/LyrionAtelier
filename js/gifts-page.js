import { formatPrice } from './price-utils.js';

// Load gift-tagged products and render them
(() => {
  // Use the same grid ID as the gifts page HTML
  const grid = document.getElementById('products-grid-local');
  const FALLBACK = '/assets/catalog/placeholder.webp';
  const PRICE_UNAVAILABLE_LABEL = '—';
  const PRICE_CENTS_THRESHOLD = 200;
  // Number of products to skip from the beginning of the gift list (to feature newer items)
  const PRODUCTS_TO_SKIP = 4;
  const SWAP_SLUGS = {
    from: 'aquarius-crop-hoodie',
    to: 'youth-aries-heavy-blend-hoodie'
  };

  const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const pick = (...items) => items.find((x) => typeof x === 'string' && String(x).trim());
  const fullRes = (u) => (u || '').replace('_thumb', '');

  const isUsableImage = (val) => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
  };

  const toDollars = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return null;
    return num > PRICE_CENTS_THRESHOLD ? num / 100 : num;
  };

  const imageCandidates = (p = {}) => {
    if (Array.isArray(p.images)) return p.images;
    if (p.images && typeof p.images === 'object') {
      const list = [];
      if (p.images.card) list.push(p.images.card);
      if (Array.isArray(p.images.gallery)) list.push(...p.images.gallery);
      return list;
    }
    return [];
  };

  function resolveProductImage(p = {}) {
    const asString = (img) => {
      if (!img) return null;
      if (typeof img === 'string') return img.trim() || null;
      return pick(
        typeof img.src === 'string' ? img.src : null,
        typeof img.url === 'string' ? img.url : null,
        typeof img.preview_url === 'string' ? img.preview_url : null,
        typeof img.thumbnail_url === 'string' ? img.thumbnail_url : null
      );
    };
    const image = isUsableImage(p.image) ? p.image.trim() : null;
    if (image) return fullRes(image);
    const fromImages = imageCandidates(p).map(asString).find(isUsableImage);
    if (fromImages) return fullRes(fromImages);
    return FALLBACK;
  }

  const normalizePrice = (p) => {
    const base =
      p?.price ??
      p?.priceUSD ??
      p?.retail_price ??
      p?.defaultVariant?.retail_price ??
      p?.variants?.[0]?.retail_price ??
      p?.variants?.[0]?.priceUSD ??
      p?.variants?.[0]?.price;
    const num = toDollars(base);
    if (!Number.isFinite(num)) return { cents: null, label: PRICE_UNAVAILABLE_LABEL, value: null };
    const cents = Math.round(num * 100);
    const dollars = cents / 100;
    return { cents, label: `USD ${dollars.toFixed(2)}`, value: dollars };
  };

  function displayPrice(p) {
    if (!p || typeof p !== 'object') return null;
    if (typeof p?.price === 'number') return p.price;
    if (Array.isArray(p?.variants) && p.variants.length) {
      const vals = p.variants
        .map((v) => toDollars(v?.price))
        .filter((x) => Number.isFinite(x));
      if (vals.length) return Math.min(...vals);
    }
    return null;
  }

  const pickVariant = (product = {}) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) return null;
    return variants.find((v) => (v?.inStock ?? true) && (v?.state?.published ?? true) && (v?.state?.ready ?? true)) || variants[0];
  };

  const normalize = (p = {}) => {
    const title = p.title || p.name || p.product_name || p.slug || '—';
    const slug = p.slug || slugify(title);
    const variant = p.defaultVariant || pickVariant(p);
    const variantPrice = normalizePrice(variant);
    const fallbackPrice = normalizePrice(p);
    const price = variantPrice?.cents !== null ? variantPrice : fallbackPrice;
    const meta = {
      category: p?.meta?.category || p.category || p.product_type || p.department || '',
      collection: p?.meta?.collection || p.collection || '',
      zodiac: p?.meta?.zodiac || p.zodiac || p.attributes?.zodiac || '',
      soldOut: p?.meta?.soldOut ?? p.soldOut ?? false
    };
    const image = resolveProductImage(p);
    return {
      ...p,
      id: p.id || p.sync_product_id || slug,
      slug,
      title,
      price: price?.value ?? null,
      priceCents: price?.cents ?? null,
      priceLabel: price?.label || PRICE_UNAVAILABLE_LABEL,
      image,
      category: meta.category,
      zodiac: meta.zodiac,
      meta,
      soldOut: meta.soldOut
    };
  };

  // Filter products that have the "gift" tag
  const filterGiftProducts = (products = []) => {
    return products.filter((p = {}) => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return tags.some((tag) => String(tag).toLowerCase() === 'gift');
    });
  };

  // Apply zodiac and search filters
  const applyFilters = (products, state = {}) => {
    const zodiac = String(state.zodiac || 'all').toLowerCase();
    const search = String(state.search || '').toLowerCase().trim();
    const normalize = (val) => String(val || '').toLowerCase().trim();

    return products.filter((p = {}) => {
      const published = p?.state?.published ?? true;
      const ready = p?.state?.ready ?? true;
      if (!published || !ready) return false;

      const productZodiac = normalize(p?.meta?.zodiac || p?.zodiac || 'all') || 'all';
      if (zodiac !== 'all' && productZodiac !== zodiac) return false;

      if (search) {
        const title = normalize(p?.title || p?.name || p?.slug || '');
        const desc = normalize(p?.description || p?.desc || '');
        if (!title.includes(search) && !desc.includes(search)) return false;
      }
      return true;
    });
  };

  async function getCatalog() {
    try {
      const local = await fetch('/data/all-products.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      if (Array.isArray(local) && local.length) {
        return local;
      }
    } catch (err) {
      console.warn('[gifts] failed to load catalog from /data/all-products.json', err);
    }
    return [];
  }

  const renderEmpty = () => {
    if (!grid) return;
    grid.innerHTML = '<div class="note subtle shop-empty-note">No gift items available at the moment. Check out our <a href="/shop">full shop</a> for more options.</div>';
  };

  const createCard = (p) => {
    const slug = p.slug || slugify(p.title || p.name || '');
    const viewTarget = p.id || slug;
    const viewUrl = p.link || `/shop/${encodeURIComponent(viewTarget)}.html`;
    const hasPriceData = Number.isFinite(p.price) || Number.isFinite(p.priceCents) || !!p.priceLabel;
    const basePrice = hasPriceData ? null : normalizePrice(p);
    const fallbackPriceValue = displayPrice(p);
    let priceCents = null;
    if (Number.isFinite(p.priceCents)) priceCents = p.priceCents;
    else if (Number.isFinite(fallbackPriceValue)) priceCents = Math.round(fallbackPriceValue * 100);
    else if (basePrice && Number.isFinite(basePrice.cents)) priceCents = basePrice.cents;

    let priceValue = null;
    if (Number.isFinite(p.price)) priceValue = p.price;
    else if (Number.isFinite(fallbackPriceValue)) priceValue = fallbackPriceValue;
    else if (basePrice && Number.isFinite(basePrice.value)) priceValue = basePrice.value;
    else if (Number.isFinite(priceCents)) priceValue = priceCents / 100;

    const fallbackLabel = (() => {
      const fb = p.priceLabel || basePrice?.label;
      return typeof fb === 'string' && fb.trim() ? fb : PRICE_UNAVAILABLE_LABEL;
    })();

    const resolvedImage = isUsableImage(p.image) ? p.image : FALLBACK;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = p.id || slug;
    card.dataset.slug = slug;

    const img = document.createElement('img');
    img.src = resolvedImage || FALLBACK;
    img.alt = `${p.title || p.name || 'Product image'}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => {
      if (img.src !== FALLBACK) {
        img.src = FALLBACK;
      }
    };

    const heading = document.createElement('h3');
    heading.textContent = p.title || p.name || 'Celestial Piece';

    const priceEl = document.createElement('p');
    priceEl.className = 'price';
    const priceDisplay = formatPrice(Number.isFinite(priceCents) ? priceCents : priceValue, fallbackLabel);
    // Check if product has multiple variants before showing "From" prefix
    const hasMultipleVariants = Array.isArray(p.variants) && p.variants.length > 1;
    priceEl.textContent = priceDisplay === PRICE_UNAVAILABLE_LABEL ? PRICE_UNAVAILABLE_LABEL : (hasMultipleVariants ? `From ${priceDisplay}` : priceDisplay);

    const viewLink = document.createElement('a');
    viewLink.className = 'view-product-btn';
    viewLink.textContent = 'View Product';
    viewLink.href = viewUrl;

    card.append(img, heading, priceEl, viewLink);
    return card;
  };

  const renderCards = (items) => {
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = '';
    (items || []).forEach((p) => grid.append(createCard(p)));
  };

  const swapProduct = (items, swap = {}) => {
    if (!Array.isArray(items) || !swap?.from || !swap?.to) return items;
    const fromIndex = items.findIndex((p) => p?.slug === swap.from);
    const toIndex = items.findIndex((p) => p?.slug === swap.to);
    if (fromIndex === -1 || toIndex === -1) return items;
    const next = [...items];
    [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
    return next;
  };

  let normalizedCatalog = [];
  let giftProducts = [];

  const gatherFilterState = () => ({
    zodiac: document.getElementById('filter-zodiac')?.value || 'all',
    search: document.getElementById('search-bar')?.value || ''
  });

  const applyAndRender = (incomingState = {}) => {
    if (!giftProducts.length) {
      renderEmpty();
      return;
    }
    const state = { ...gatherFilterState(), ...incomingState };
    const filtered = applyFilters(giftProducts, state);
    if (!filtered.length) {
      renderEmpty();
    } else {
      renderCards(filtered);
    }
  };

  const bindFilters = () => {
    const zodiac = document.getElementById('filter-zodiac');
    const applyBtn = document.getElementById('filter-apply');
    const search = document.getElementById('search-bar');
    const handler = () => applyAndRender();
    zodiac?.addEventListener('change', handler);
    search?.addEventListener('input', handler);
    applyBtn?.addEventListener('click', (e) => { e.preventDefault(); handler(); });
  };

  const loadAndRender = async () => {
    try {
      const catalogRaw = await getCatalog();
      normalizedCatalog = catalogRaw.map(normalize);
      giftProducts = filterGiftProducts(normalizedCatalog);
      giftProducts = swapProduct(giftProducts, SWAP_SLUGS);
      
      // Skip the first PRODUCTS_TO_SKIP products to feature newer items (Pisces, Taurus) more prominently
      // Products are ordered by their position in all-products.json (gift-tagged products preserve catalog order)
      if (giftProducts.length > PRODUCTS_TO_SKIP) {
        giftProducts = giftProducts.slice(PRODUCTS_TO_SKIP);
      }
      
      // If no gift-tagged products, show all bestsellers as fallback
      if (!giftProducts.length) {
        giftProducts = normalizedCatalog.filter((p) => p.isBestseller === true || p.showOnHomepage === true);
      }
      
      // Final fallback: show first 8 products if still empty
      if (!giftProducts.length && normalizedCatalog.length) {
        giftProducts = normalizedCatalog.slice(0, 8);
      }
      
      bindFilters();
      if (!giftProducts.length) {
        renderEmpty();
      } else {
        applyAndRender();
      }
    } catch (err) {
      console.warn('[gifts] failed to render catalog', err);
      renderEmpty();
    }
  };

  document.readyState !== 'loading' ? loadAndRender() : document.addEventListener('DOMContentLoaded', loadAndRender);
})();
