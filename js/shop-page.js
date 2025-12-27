import { apply as applyFilters } from './shop-filters.js';
import { formatPrice, currencySymbol } from './price-utils.js';

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
  const ZODIAC_ORDER = ZODIAC_SIGNS.map((z) => z.charAt(0).toUpperCase() + z.slice(1));
  const CATEGORY_ORDER = ['Men', 'Women', 'Unisex', 'Youth', 'Accessories', 'Rituals'];
  const COLLECTION_ORDER = ['Zodiac', 'Lyrion Atelier Core'];
  const fadeMs = 240;
  let loaderHideTimer = null;
  let loaderVisible = !!loader;
  const showLoader = (state) => {
    if (!loader) return;
    if (!loader.style.transition) loader.style.transition = `opacity ${fadeMs}ms ease`;
    if (state) {
      loaderVisible = true;
      if (loaderHideTimer) clearTimeout(loaderHideTimer);
      loader.style.display = '';
      requestAnimationFrame(() => { if (loader && loaderVisible) loader.style.opacity = '1'; });
    } else {
      if (!loaderVisible) return;
      loaderVisible = false;
      if (loaderHideTimer) clearTimeout(loaderHideTimer);
      loader.style.opacity = '0';
      loaderHideTimer = setTimeout(() => { loader.style.display = 'none'; }, fadeMs);
    }
  };
  const hideLoader = () => showLoader(false);
  const safetyHide = setTimeout(hideLoader, LOADER_TIMEOUT_MS);
  const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const pick = (...items) => items.find((x) => typeof x === 'string' && String(x).trim());
  const fullRes = (u) => (u || '').replace('_thumb', '');
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

  const toList = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || typeof value === 'undefined') return [];
    return [value];
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

  const toDollars = (val) => {
    const num = Number(val);
    if (!Number.isFinite(num)) return null;
    return num > PRICE_CENTS_THRESHOLD ? num / 100 : num;
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
    if (image) return fullRes(image);
    const fromImages = imageCandidates(p).map(asString).find(isUsableImage);
    if (fromImages) return fullRes(fromImages);
    const fromFiles = Array.isArray(p.files) ? p.files.map(asString).find(isUsableImage) : null;
    if (fromFiles) return fullRes(fromFiles);
    const fromVariants = pickVariantPreview(p.variants);
    return fromVariants ? fullRes(fromVariants) : FALLBACK;
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

  /**
   * Resolve a numeric price from the product or its variants.
   */
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

  const normalize = (p = {}, imageMap = {}, zodiacMap = {}) => {
    const title = p.title || p.name || p.product_name || p.slug || '—';
    const slug =
      p.slug ||
      slugify(title);
    const asImageString = (img) => {
      if (!img) return null;
      if (typeof img === 'string') return img.trim() || null;
      return pick(
        typeof img.url === 'string' ? img.url : null,
        typeof img.src === 'string' ? img.src : null,
        typeof img.preview_url === 'string' ? img.preview_url : null,
        typeof img.thumbnail === 'string' ? img.thumbnail : null,
        typeof img.thumbnail_url === 'string' ? img.thumbnail_url : null
      );
    };
    const normalizedImages = ([...(p.image ? [p.image] : []), ...imageCandidates(p)])
      .map(asImageString)
      .filter(isUsableImage)
      .map(fullRes);
    const variant = p.defaultVariant || pickVariant(p);
    const variantPrice = normalizePrice(variant);
    const fallbackPrice = normalizePrice(p);
    const price = variantPrice?.cents !== null ? variantPrice : fallbackPrice;
    const firstValue = (val) => {
      if (Array.isArray(val)) return val[0];
      return val;
    };
    const resolveCollection = () => firstValue(p?.meta?.collection) || firstValue(p.collection) || '';
    const meta = {
      category: p?.meta?.category || p.category || p.product_type || p.department || '',
      collection: resolveCollection(),
      zodiac: p?.meta?.zodiac || p.zodiac || p.attributes?.zodiac || '',
      soldOut: p?.meta?.soldOut ?? p.soldOut ?? false
    };
    const firstVariantId =
      p.defaultVariant?.id ||
      p.defaultVariantId ||
      variant?.variant_id ||
      variant?.id ||
      variant?.printfulVariantId ||
      variant?.printful_variant_id ||
      p.variants?.[0]?.id ||
      p.variants?.[0]?.printfulVariantId ||
      p.variants?.[0]?.printful_variant_id ||
      null;
    const canBuy = price?.cents !== null && !!firstVariantId;
    const image = normalizedImages.find(isUsableImage) || resolveProductImage({ ...p, slug, title }, imageMap, zodiacMap);
    const images = (() => {
      const base = normalizedImages.length ? normalizedImages : (image ? [image] : []);
      const ready = base.filter(Boolean).map(fullRes);
      if (!ready.length) ready.push(FALLBACK);
      const seed = ready[0] || FALLBACK;
      while (ready.length < 4) ready.push(seed);
      return ready;
    })();
    return {
      ...p,
      id: p.id || p.sync_product_id || slug,
      slug,
      title,
      images,
      variants: Array.isArray(p.variants) ? p.variants : (variant ? [variant] : []),
      defaultVariantId:
        p.defaultVariantId ||
        p.defaultVariant?.id ||
        p.variants?.[0]?.id ||
        p.variants?.[0]?.printfulVariantId ||
        p.variants?.[0]?.printful_variant_id ||
        null,
      price: price?.value ?? null,
      priceCents: price?.cents ?? null,
      priceLabel: price?.label || PRICE_UNAVAILABLE_LABEL,
      canBuy,
      firstVariantId,
      image,
      category: meta.category,
      zodiac: meta.zodiac,
      meta,
      soldOut: meta.soldOut
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
    const viewUrl = `/shop/${encodeURIComponent(slug)}`;
    const variant = p.defaultVariant || pickVariant(p);
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
    const priceRange = (() => {
      const priceSource = (() => {
        if (p && typeof p.price === 'object' && p.price !== null) return p.price;
        if (p && typeof p.price_range === 'object' && p.price_range !== null) return p.price_range;
        return null;
      })();
      const currency = ((priceSource && priceSource.currency) || p.currency || 'USD').toUpperCase();
      const symbol = currencySymbol(currency);
      const min = Number(priceSource?.min);
      const max = Number(priceSource?.max);
      if (Number.isFinite(min) && Number.isFinite(max) && max >= min) {
        return max > min ? `${symbol}${min.toFixed(2)} – ${symbol}${max.toFixed(2)}` : `${symbol}${min.toFixed(2)}`;
      }
      if (Number.isFinite(min)) return `${symbol}${min.toFixed(2)}`;
      return null;
    })();
    const fallbackLabel = (() => {
      const fb = p.priceLabel || priceRange || basePrice?.label;
      return typeof fb === 'string' && fb.trim() ? fb : PRICE_UNAVAILABLE_LABEL;
    })();
    const priceDisplay = priceRange || formatPrice(Number.isFinite(priceCents) ? priceCents : priceValue, fallbackLabel);
    const primaryImage = Array.isArray(p.images) ? p.images[0] : null;
    const resolvedImage = isUsableImage(primaryImage) ? primaryImage : resolveProductImage(p, cachedImageMap, cachedZodiacMap);
    const galleryImages = (() => {
      const seeds = Array.isArray(p.images) && p.images.length ? p.images : [resolvedImage || FALLBACK];
      const normalized = seeds.filter(Boolean).map(fullRes);
      if (!normalized.length) normalized.push(FALLBACK);
      const seed = normalized[0] || FALLBACK;
      while (normalized.length < 4) normalized.push(seed);
      return normalized.slice(0, 4);
    })();
    const soldOut = (p?.meta?.soldOut ?? p?.soldOut) === true;

    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = p.id || slug;
    card.dataset.slug = slug;
    if (soldOut) {
      card.classList.add('product-card--sold-out');
      card.dataset.soldOut = 'true';
    }

    const coverImage = galleryImages.find(isUsableImage) || resolvedImage || FALLBACK;
    const img = document.createElement('img');
    img.src = coverImage || FALLBACK;
    img.alt = `${p.title || p.name || 'Product image'}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.className = 'product-card-image';
    img.onerror = () => {
      if (img.src !== FALLBACK) {
        img.src = FALLBACK;
      }
      hideLoader();
    };
    img.onload = hideLoader;

    const body = document.createElement('div');
    body.className = 'product-card-content product-card__body';
    const heading = document.createElement('h3');
    heading.className = 'product-card-title product-card__title';
    heading.textContent = p.title || p.name || 'Celestial Piece';
    const desc = document.createElement('p');
    desc.className = 'product-card-description';
    desc.textContent = p.description || p.desc || '';
    const priceEl = document.createElement('p');
    priceEl.className = 'product-card-price product-card__price price';
    priceEl.textContent = priceDisplay || PRICE_UNAVAILABLE_LABEL;

    const actions = document.createElement('div');
    actions.className = 'product-card-buttons product-card__actions';
    const buyBtn = document.createElement('a');
    buyBtn.className = 'view-product-button view-button product-buy-btn';
    buyBtn.textContent = 'View Product';
    buyBtn.href = viewUrl;
    buyBtn.dataset.action = 'view';
    buyBtn.dataset.slug = slug;
    buyBtn.dataset.name = p.title || p.name || 'Celestial Piece';
    buyBtn.setAttribute('aria-label', 'View');
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-to-cart-button add-to-cart-btn';
    addBtn.textContent = 'Add to Cart';
    addBtn.dataset.name = p.title || p.name || 'Celestial Piece';
    addBtn.dataset.price = priceDisplay || '';
    addBtn.dataset.variantId = p.firstVariantId || '';
    addBtn.dataset.productId = p.id || slug;
    if (soldOut || !p.firstVariantId) {
      addBtn.disabled = true;
      addBtn.setAttribute('aria-disabled', 'true');
    }
    if (soldOut) {
      buyBtn.classList.add('is-disabled');
      buyBtn.setAttribute('aria-disabled', 'true');
    }

    actions.append(buyBtn, addBtn);
    body.append(heading, desc, priceEl, actions);
    if (soldOut) {
      const ribbon = document.createElement('span');
      ribbon.className = 'product-card__ribbon product-card__ribbon--sold-out';
      ribbon.textContent = 'Sold out';
      card.append(ribbon);
    }
    card.append(img, body);
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-buy-btn, .add-to-cart-btn')) return;
      if (soldOut) return;
      window.location.href = viewUrl;
    });
    return card;
  };

  const highlightFromQuery = () => {
    const params = new URLSearchParams(location.search);
    const target = (params.get('highlight') || '').toLowerCase();
    if (!target) return;
    const cards = Array.from(document.querySelectorAll('.product-card'));
    const match = cards.find((card) => {
      const slug = (card.dataset.slug || '').toLowerCase();
      const id = (card.dataset.id || '').toLowerCase();
      return slug === target || id === target;
    });
    if (!match) return;
    match.classList.add('product-card--highlight');
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const renderCards = (items) => {
    if (typeof mountGrid === 'function') {
      mountGrid(items);
      highlightFromQuery();
      return;
    }
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = '';
    (items || []).forEach((p) => grid.append(createCard(p)));
    highlightFromQuery();
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

  const normalizeLabel = (val) => {
    if (typeof val === 'string') return val.trim();
    return String(val || '').trim();
  };
  const dedupeOrdered = (preferred = [], values = []) => {
    const seen = new Set();
    const result = [];
    const add = (val) => {
      const label = normalizeLabel(val);
      if (!label) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(label);
    };
    preferred.forEach(add);
    values.forEach(add);
    return result;
  };
  const setOptions = (select, values, allLabel = 'All', allValue = 'all') => {
    if (!select) return;
    const previous = select.value || allValue;
    select.innerHTML = '';
    const addOpt = (value, label) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.appendChild(opt);
    };
    addOpt(allValue, allLabel);
    values.forEach((val) => addOpt(val, val));
    const match = values.find((val) => val.toLowerCase() === (previous || '').toLowerCase());
    select.value = match || allValue;
  };

  const populateFilterOptions = (catalog = []) => {
    const categoryValues = dedupeOrdered(
      CATEGORY_ORDER,
      catalog.map((p = {}) => p?.meta?.category || p?.category).filter(Boolean)
    );
    const collectionValues = dedupeOrdered(
      COLLECTION_ORDER,
      catalog.flatMap((p = {}) => toList(p?.meta?.collection || p?.collection)).filter(Boolean)
    );
    const zodiacValues = dedupeOrdered(
      ZODIAC_ORDER,
      catalog
        .map((p = {}) => p?.meta?.zodiac || p?.zodiac)
        .filter((z) => z && z.toLowerCase() !== 'none')
    );
    setOptions(document.getElementById('filter-category'), categoryValues, 'All');
    setOptions(document.getElementById('filter-collection'), collectionValues, 'All');
    setOptions(document.getElementById('filter-zodiac'), zodiacValues, 'All signs');
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
      populateFilterOptions(normalized);
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
