import { apply as applyFilters } from './shop-filters.js';

// Load products from global or API and render; hide loader quickly even on empty
(() => {
  const loader = document.querySelector('[data-shop-loader]') || document.getElementById('products-loading') || document.getElementById('shop-loader');
  const grid =
    document.querySelector('[data-grid="products"]') ||
    document.getElementById('products-grid') ||
    document.getElementById('products-grid-local') ||
    document.getElementById('shopGrid');
  const FALLBACK = '/assets/catalog/placeholder.webp';
  const LOADER_TIMEOUT_MS = 1800;
  // Values above this threshold are treated as cents and converted to dollars.
  const PRICE_CENTS_THRESHOLD = 200;
  const ZODIAC_SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const showLoader = (state) => { if (loader) loader.style.display = state ? '' : 'none'; };
  const hideLoader = () => showLoader(false);
  const safetyHide = setTimeout(hideLoader, LOADER_TIMEOUT_MS);
  const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const pick = (...items) => items.find((x) => typeof x === 'string' && String(x).trim());
  let imageMapPromise = null;
  let cachedImageMap = {};
  let cachedZodiacMap = {};
  let normalizedCatalog = [];
  const withTimeout = (ms) => {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return { signal: AbortSignal.timeout(ms) };
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    ctrl.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
    return { signal: ctrl.signal };
  };

  const stripDebug = () => {
    document.querySelectorAll('#asset-strip, .debug-thumbs, .thumb-strip, .stray-thumb, #sign-gallery, .sign-strip').forEach(el => el.remove());
  };

  async function getImageMap(){
    if (imageMapPromise) return imageMapPromise;
    imageMapPromise = fetch('/data/image-map.json', { cache: 'no-store' })
      .then(res => res.ok ? res.json() : {})
      .catch(() => ({}))
      .then((map) => {
        cachedImageMap = map || {};
        return cachedImageMap;
      });
    return imageMapPromise;
  }

  const buildZodiacMap = (imageMap = {}) => {
    const map = {};
    const entries = Object.entries(imageMap || {});
    for (const [key, url] of entries) {
      const sign = ZODIAC_SIGNS.find((z) => key.includes(z) || String(url || '').includes(`/${z}`));
      if (sign && !map[sign]) map[sign] = url;
    }
    ZODIAC_SIGNS.forEach((sign) => {
      if (!map[sign] && imageMap[sign]) map[sign] = imageMap[sign];
      if (!map[sign]) {
        const candidate =
          pick(
            `/assets/catalog/zodiac/${sign}.webp`,
            `/assets/catalog/zodiac/${sign}.png`,
            `/assets/catalog/${sign}.webp`,
            `/assets/catalog/${sign}.png`
          ) || null;
        if (candidate) map[sign] = candidate;
      }
      if (!map[sign]) map[sign] = FALLBACK;
    });
    cachedZodiacMap = map;
    return map;
  };

  function resolveProductImage(p = {}, imageMap = {}, zodiacMap = cachedZodiacMap || {}) {
    const firstImage = Array.isArray(p.images) ? p.images[0] : null;
    const fromImages = pick(
      firstImage?.src,
      firstImage?.thumbnail,
      firstImage?.url,
      typeof firstImage === 'string' ? firstImage : null,
      p.preview_url,
      p.thumbnail_url,
      p.image,
      p.images?.display,
      p.thumbnail,
      p.assets?.[0]?.url,
      p.files?.[0]?.preview_url,
      p.files?.[0]?.thumbnail_url,
      p.variants?.[0]?.files?.[0]?.preview_url
    );
    const key = slugify(p.slug || p.zodiac || p.title || p.name || '');
    const fromMap = key ? imageMap[key] : null;
    const mockup = pick(
      p.mockup_url,
      p.mockup,
      p.mockup?.url,
      p.mockups?.[0],
      p.mockups?.[0]?.url,
      p.mockups?.[0]?.file_url,
      p.mockups?.[0]?.preview_url,
      p.variants?.[0]?.mockup_url
    );
    const zodiacSlug = slugify(p.zodiac || '');
    const zodiacFallback = zodiacSlug ? zodiacMap[zodiacSlug] : null;
    return fromImages || mockup || fromMap || zodiacFallback || FALLBACK;
  }

  const normalizePrice = (p) => {
    const base = p.price ?? p.priceUSD ?? p.variants?.[0]?.price ?? p.variants?.[0]?.retail_price;
    const num = typeof base === 'number' ? base : Number(base);
    return Number.isFinite(num) ? (num > PRICE_CENTS_THRESHOLD ? num / 100 : num) : null;
  };

  const pickVariant = (product = {}) => {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (!variants.length) return null;
    return variants.find((v) => (v?.inStock ?? true) && (v?.state?.published ?? true) && (v?.state?.ready ?? true)) || variants[0];
  };

  const normalize = (p = {}, imageMap = {}, zodiacMap = {}) => {
    const title = p.title || p.name || p.product_name || p.slug || '—';
    const slug =
      p.slug ||
      slugify(title);
    const variant = pickVariant(p);
    const price = normalizePrice(variant) ?? normalizePrice(p);
    return {
      ...p,
      id: p.id || p.sync_product_id || slug,
      slug,
      title,
      variants: Array.isArray(p.variants) ? p.variants : (variant ? [variant] : []),
      price,
      image: resolveProductImage({ ...p, slug, title }, imageMap, zodiacMap),
      category: p.category || p.product_type || p.department || '',
      zodiac: p.zodiac || p.attributes?.zodiac || ''
    };
  };

  async function getCatalog() {
    let catalog = window.LyrionAtelier?.products;
    if (!Array.isArray(catalog) || catalog.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      catalog = window.LyrionAtelier?.products;
    }
    if (!Array.isArray(catalog) || catalog.length === 0) {
      const local = await fetch('/data/all-products.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
      if (Array.isArray(local) && local.length) catalog = local;
    }
    if (!Array.isArray(catalog) || catalog.length === 0) {
      let res = await fetch('/netlify/functions/printful-sync', withTimeout(8000)).catch(() => null);
      if (!res?.ok) res = await fetch('/api/printful-catalog', withTimeout(8000)).catch(() => null);
      if (res?.ok) {
        const json = await res.json();
        catalog = Array.isArray(json?.products) ? json.products : json;
      }
    }
    return Array.isArray(catalog) ? catalog : [];
  }

  const renderEmpty = () => {
    if (!grid) return;
    grid.innerHTML = '<div class="note subtle shop-empty-note">Catalog is updating, check back shortly.</div>';
  };

  const createCard = (p) => {
    const slug = p.slug || slugify(p.title || p.name || '');
    const viewUrl = `/product/${slug}`;
    const variant = pickVariant(p);
    const price = normalizePrice(variant) ?? normalizePrice(p);
    const imgSrc = resolveProductImage(p, cachedImageMap, cachedZodiacMap);

    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.id = p.id || slug;
    card.dataset.slug = slug;

    const media = document.createElement('div');
    media.className = 'product-card__media media';
    const img = document.createElement('img');
    img.src = imgSrc || FALLBACK;
    img.alt = p.title || p.name || 'Product image';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => { if (img.src !== FALLBACK) img.src = FALLBACK; };
    img.onload = () => { card.classList.add('media-ready'); };
    media.appendChild(img);

    const body = document.createElement('div');
    body.className = 'product-card__body';
    const heading = document.createElement('h3');
    heading.className = 'product-card__title';
    heading.textContent = p.title || p.name || 'Celestial Piece';
    const priceEl = document.createElement('div');
    priceEl.className = 'product-card__price';
    priceEl.textContent = Number.isFinite(price) ? `USD ${price.toFixed(2)}` : '';

    const actions = document.createElement('div');
    actions.className = 'product-card__actions';
    const viewBtn = document.createElement('a');
    viewBtn.className = 'btn btn-ghost';
    viewBtn.href = viewUrl;
    viewBtn.textContent = 'View';
    viewBtn.setAttribute('data-action', 'view');

    const buyBtn = document.createElement('button');
    buyBtn.type = 'button';
    buyBtn.className = 'btn btn-primary product-buy-btn';
    buyBtn.textContent = 'Buy Now';
    buyBtn.dataset.name = p.title || p.name || 'Product';
    if (Number.isFinite(price)) buyBtn.dataset.price = String(price);
    const variantId = variant?.variant_id || variant?.id || p.variantId;
    if (variantId) buyBtn.dataset.variantId = variantId;
    const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    const inStock = hasVariants ? !!(variant && (variant.inStock ?? true) && (variant.state?.published ?? true) && (variant.state?.ready ?? true)) : true;
    if (!inStock || !Number.isFinite(price)) {
      buyBtn.disabled = true;
      buyBtn.title = 'Unavailable';
    }
    buyBtn.addEventListener('click', (e) => e.stopPropagation());

    actions.append(viewBtn, buyBtn);
    body.append(heading, priceEl, actions);
    card.append(media, body);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-buy-btn')) return;
      window.location.href = viewUrl;
    });
    return card;
  };

  const renderCards = (items) => {
    if (typeof mountGrid === 'function') {
      mountGrid(items);
      return;
    }
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = '';
    (items || []).forEach((p) => grid.append(createCard(p)));
  };

  const hydrateGlobal = (catalog, imageMap, zodiacMap) => {
    window.LyrionAtelier = window.LyrionAtelier || {};
    window.LyrionAtelier.shopState = window.LyrionAtelier.shopState || {};
    if (!window.LyrionAtelier.products || catalog.length > (window.LyrionAtelier.products?.length || 0)) {
      window.LyrionAtelier.products = catalog;
    }
    if (imageMap) window.LyrionAtelier.imageMap = imageMap;
    if (zodiacMap) window.LyrionAtelier.zodiacImages = zodiacMap;
    if (typeof window !== 'undefined') {
      window.resolveProductImage = resolveProductImage;
      window.pickVariant = pickVariant;
    }
  };

  const syncFilterInputs = () => {
    const state = window.LyrionAtelier?.shopState || {};
    const category = document.getElementById('filter-category');
    const zodiac = document.getElementById('filter-zodiac');
    if (category && state.category) category.value = state.category;
    if (zodiac && state.zodiac) zodiac.value = state.zodiac;
  };

  const gatherFilterState = () => ({
    category: document.getElementById('filter-category')?.value || 'all',
    zodiac: document.getElementById('filter-zodiac')?.value || 'all'
  });

  const applyAndRender = (incomingState = {}) => {
    if (!normalizedCatalog.length) {
      renderEmpty();
      return;
    }
    const state = { ...(window.LyrionAtelier?.shopState || {}), ...gatherFilterState(), ...incomingState };
    window.LyrionAtelier.shopState = state;
    const filtered = applyFilters(normalizedCatalog, state);
    if (!filtered.length) {
      renderEmpty();
    } else {
      renderCards(filtered);
    }
  };

  const bindFilters = () => {
    const category = document.getElementById('filter-category');
    const zodiac = document.getElementById('filter-zodiac');
    const applyBtn = document.getElementById('filter-apply');
    const handler = () => applyAndRender();
    category?.addEventListener('change', handler);
    zodiac?.addEventListener('change', handler);
    applyBtn?.addEventListener('click', (e) => { e.preventDefault(); handler(); });
  };

  const loadAndRender = async () => {
    stripDebug();
    showLoader(true);
    try {
      const [catalogRaw, imageMap] = await Promise.all([getCatalog(), getImageMap()]);
      const zodiacMap = buildZodiacMap(imageMap || {});
      const catalog = catalogRaw.filter(
        (p = {}) =>
          (String(p.category || '').toLowerCase() !== 'oracle') &&
          (String(p.type || '').toLowerCase() !== 'event')
      );
      const normalized = catalog.map((p) => normalize(p, imageMap || {}, zodiacMap));
      normalizedCatalog = normalized;
      hydrateGlobal(normalized, imageMap, zodiacMap);
      syncFilterInputs();
      bindFilters();
      if (!normalized.length) { renderEmpty(); }
      else { applyAndRender(); }
    } catch (err) {
      console.warn('[shop] failed to render catalog', err);
      renderEmpty();
    } finally {
      clearTimeout(safetyHide);
      hideLoader();
    }
  };

  document.readyState !== 'loading' ? loadAndRender() : document.addEventListener('DOMContentLoaded', loadAndRender);
})();
