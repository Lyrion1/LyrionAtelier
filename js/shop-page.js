import { apply as applyFilters } from './shop-filters.js';
import { formatPrice } from './price-utils.js';

// Load products from global or API and render; hide loader quickly even on empty
(() => {
  const loader = document.querySelector('[data-shop-loader]') || document.getElementById('products-loading') || document.getElementById('shop-loader');
  const grid =
    document.querySelector('[data-grid="products"]') ||
    document.getElementById('products-grid') ||
    document.getElementById('products-grid-local') ||
    document.getElementById('shopGrid');
  const FALLBACK = '/assets/catalog/placeholder.webp';
  const PRICE_UNAVAILABLE_LABEL = '—';
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

  const isUsableImage = (val) => {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    if (!trimmed) return false;
    return /^https?:\/\//i.test(trimmed) || trimmed.startsWith('/');
  };

  const pickVariantPreview = (variants = []) => {
    if (!Array.isArray(variants)) return null;
    return variants
      .map((v = {}) => {
        const file = Array.isArray(v.files) ? v.files.find((f) => f?.preview_url || f?.thumbnail_url || f?.url) : null;
        return file?.preview_url || file?.thumbnail_url || file?.url || null;
      })
      .find(isUsableImage);
  };

  function resolveProductImage(p = {}, imageMap = {}, zodiacMap = cachedZodiacMap || {}) {
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
    if (image) return image;
    const fromImages = Array.isArray(p.images) ? p.images.map(asString).find(isUsableImage) : null;
    if (fromImages) return fromImages;
    const fromFiles = Array.isArray(p.files) ? p.files.map(asString).find(isUsableImage) : null;
    if (fromFiles) return fromFiles;
    const fromVariants = pickVariantPreview(p.variants);
    return fromVariants || FALLBACK;
  }

  const normalizePrice = (p) => {
    const base =
      p?.price ??
      p?.priceUSD ??
      p?.retail_price ??
      p?.defaultVariant?.retail_price ??
      p?.variants?.[0]?.retail_price ??
      p?.variants?.[0]?.price;
    const num = typeof base === 'number' ? base : Number(base);
    if (!Number.isFinite(num)) return { cents: null, label: PRICE_UNAVAILABLE_LABEL, value: null };
    const cents = num > PRICE_CENTS_THRESHOLD ? Math.round(num) : Math.round(num * 100);
    const dollars = cents / 100;
    return { cents, label: `USD ${dollars.toFixed(2)}`, value: dollars };
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
    const variant = p.defaultVariant || pickVariant(p);
    const variantPrice = normalizePrice(variant);
    const fallbackPrice = normalizePrice(p);
    const price = variantPrice?.cents !== null ? variantPrice : fallbackPrice;
    const firstVariantId =
      p.defaultVariant?.id ||
      p.defaultVariantId ||
      variant?.variant_id ||
      variant?.id ||
      p.variants?.[0]?.id ||
      null;
    const canBuy = price?.cents !== null && !!firstVariantId;
    return {
      ...p,
      id: p.id || p.sync_product_id || slug,
      slug,
      title,
      variants: Array.isArray(p.variants) ? p.variants : (variant ? [variant] : []),
      defaultVariantId: p.defaultVariantId || p.defaultVariant?.id || p.variants?.[0]?.id || null,
      price: price?.value ?? null,
      priceCents: price?.cents ?? null,
      priceLabel: price?.label || PRICE_UNAVAILABLE_LABEL,
      canBuy,
      firstVariantId,
      image: resolveProductImage({ ...p, slug, title }, imageMap, zodiacMap),
      category: p.category || p.product_type || p.department || '',
      zodiac: p.zodiac || p.attributes?.zodiac || ''
    };
  };

  const coerceSyncVariant = (variant = {}) => {
    const files = Array.isArray(variant.files) ? variant.files.filter(Boolean) : [];
    const retail = variant.retail_price ?? variant.price ?? null;
    const priceNum = Number(retail);
    const resolved = variant.variant_id ?? variant.id ?? null;
    return {
      ...variant,
      files,
      retail_price: retail,
      price: Number.isFinite(priceNum) ? priceNum : null,
      id: resolved,
      variant_id: resolved
    };
  };

  const normalizeSyncProduct = (product = {}) => {
    if (!Array.isArray(product.sync_variants)) return product;
    const variants = product.sync_variants.map(coerceSyncVariant);
    const firstFile = pickVariantPreview(variants);
    const title = product.title ?? product.name ?? null;
    const thumbnail = product.thumbnail_url || product.thumbnailUrl || null;
    return {
      ...product,
      title,
      name: product.name ?? product.title ?? title ?? null,
      files: Array.isArray(product.files) ? product.files : [],
      image: thumbnail || firstFile || product.image || null,
      variants
    };
  };

  async function getCatalog() {
    try {
      const local = await fetch('/data/all-products.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      if (Array.isArray(local) && local.length) {
        window.LyrionAtelier = window.LyrionAtelier || {};
        window.LyrionAtelier.products = local;
        return local.map(normalizeSyncProduct);
      }
    } catch (err) {
      console.warn('[shop] failed to load catalog from /data/all-products.json', err);
    }
    return [];
  }

  const renderEmpty = () => {
    if (!grid) return;
    grid.innerHTML = '<div class="note subtle shop-empty-note">Catalog is updating, check back shortly.</div>';
  };

  const createCard = (p) => {
    const slug = p.slug || slugify(p.title || p.name || '');
    const viewUrl = `/shop/${slug}.html`;
    const variant = p.defaultVariant || pickVariant(p);
    const hasPriceData = Number.isFinite(p.price) || Number.isFinite(p.priceCents) || !!p.priceLabel;
    const basePrice = hasPriceData ? null : normalizePrice(p);
    const priceCents = Number.isFinite(p.priceCents) ? p.priceCents : basePrice?.cents ?? null;
    const priceValue = Number.isFinite(p.price)
      ? p.price
      : basePrice?.value ?? (Number.isFinite(priceCents) ? priceCents / 100 : null);
    const fallbackLabel = (() => {
      const fb = p.priceLabel || basePrice?.label;
      return typeof fb === 'string' && fb.trim() ? fb : PRICE_UNAVAILABLE_LABEL;
    })();
    const priceDisplay = formatPrice(Number.isFinite(priceCents) ? priceCents : priceValue, fallbackLabel);
    const primaryImage = Array.isArray(p.images) ? p.images[0] : null;
    const resolvedImage = isUsableImage(primaryImage) ? primaryImage : resolveProductImage(p, cachedImageMap, cachedZodiacMap);
    const imgSrc = isUsableImage(resolvedImage) ? resolvedImage : FALLBACK;

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
    priceEl.textContent = priceDisplay || PRICE_UNAVAILABLE_LABEL;

    const actions = document.createElement('div');
    actions.className = 'product-card__actions';
    const buyBtn = document.createElement('a');
    buyBtn.className = 'btn btn-primary product-buy-btn';
    buyBtn.textContent = 'View Product';
    buyBtn.href = viewUrl;
    buyBtn.dataset.action = 'view';
    buyBtn.dataset.slug = slug;
    buyBtn.dataset.name = p.title || p.name || 'Celestial Piece';

    actions.append(buyBtn);
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
    const collection = document.getElementById('filter-collection');
    if (category && state.category) category.value = state.category;
    if (zodiac && state.zodiac) zodiac.value = state.zodiac;
    if (collection && state.collection) collection.value = state.collection;
  };

  const gatherFilterState = () => ({
    category: document.getElementById('filter-category')?.value || 'all',
    zodiac: document.getElementById('filter-zodiac')?.value || 'all',
    collection: document.getElementById('filter-collection')?.value || 'all'
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
    const collection = document.getElementById('filter-collection');
    const applyBtn = document.getElementById('filter-apply');
    const handler = () => applyAndRender();
    category?.addEventListener('change', handler);
    zodiac?.addEventListener('change', handler);
    collection?.addEventListener('change', handler);
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
      const isHttp = (val) => /^https?:\/\//i.test(val || '');
      const hasRemote = (item = {}) => {
        const direct = typeof item.image === 'string' ? item.image : '';
        const first = Array.isArray(item.images) ? item.images[0] : '';
        return isHttp(direct) || isHttp(first || '');
      };
      const remoteCount = normalized.filter(hasRemote).length;
      console.log(`[shop] products with remote images: ${remoteCount} / total: ${normalized.length}`);
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
