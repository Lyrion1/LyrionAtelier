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
  const showLoader = (state) => { if (loader) loader.style.display = state ? '' : 'none'; };
  const hideLoader = () => showLoader(false);
  const safetyHide = setTimeout(hideLoader, LOADER_TIMEOUT_MS);
  const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let imageMapPromise = null;
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
      .catch(() => ({}));
    return imageMapPromise;
  }

  function resolveProductImage(p = {}, imageMap = {}) {
    const pick = (...items) => items.find((x) => typeof x === 'string' && x.trim());
    const fromRemote = pick(
      p.preview_url,
      p.thumbnail_url,
      p.mockup_url,
      p.image,
      p.images?.[0],
      p.images?.[0]?.url,
      p.images?.display,
      p.thumbnail,
      p.mockup,
      p.mockup?.url,
      p.mockups?.[0],
      p.mockups?.[0]?.url,
      p.mockups?.[0]?.file_url,
      p.mockups?.[0]?.preview_url,
      p.assets?.[0]?.url,
      p.files?.[0]?.preview_url,
      p.files?.[0]?.thumbnail_url,
      p.variants?.[0]?.files?.[0]?.preview_url,
      p.variants?.[0]?.mockup_url
    );
    const key = slugify(p.slug || p.zodiac || p.title || p.name || '');
    const fromMap = key ? imageMap[key] : null;
    return fromRemote || fromMap || FALLBACK;
  }

  const normalizePrice = (p) => {
    const base = p.price ?? p.priceUSD ?? p.variants?.[0]?.price ?? p.variants?.[0]?.retail_price;
    const num = typeof base === 'number' ? base : Number(base);
    return Number.isFinite(num) ? (num > PRICE_CENTS_THRESHOLD ? num / 100 : num) : null;
  };

  const normalize = (p = {}, imageMap = {}) => {
    const title = p.title || p.name || p.product_name || p.slug || '—';
    const slug =
      p.slug ||
      slugify(title);
    return {
      ...p,
      id: p.id || p.sync_product_id || slug,
      slug,
      title,
      price: normalizePrice(p),
      image: resolveProductImage({ ...p, slug, title }, imageMap),
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

  const renderCards = (items) => {
    if (typeof mountGrid === 'function') {
      mountGrid(items);
      return;
    }
    if (!grid) return;
    grid.innerHTML = '';
    grid.style.display = '';
    items.forEach((p) => {
      const card = document.createElement('article');
      card.className = 'product-card';

      const media = document.createElement('div');
       media.className = 'product-card__media media';
       const img = document.createElement('img');
       img.src = p.image || FALLBACK;
       img.alt = p.title || 'Product image';
       img.loading = 'lazy';
       img.decoding = 'async';
       img.onerror = () => { if (img.src !== FALLBACK) img.src = FALLBACK; };
       media.appendChild(img);

      const body = document.createElement('div');
      body.className = 'product-card__body';
      const heading = document.createElement('h3');
      heading.className = 'product-card__title';
      heading.textContent = p.title;
      const price = document.createElement('div');
      price.className = 'product-card__price';
      price.textContent = Number.isFinite(p.price) ? `USD ${p.price.toFixed(2)}` : '';
      body.append(heading, price);

      card.append(media, body);
      grid.append(card);
    });
  };

  const hydrateGlobal = (catalog, imageMap) => {
    window.LyrionAtelier = window.LyrionAtelier || {};
    window.LyrionAtelier.shopState = window.LyrionAtelier.shopState || {};
    if (!window.LyrionAtelier.products || catalog.length > (window.LyrionAtelier.products?.length || 0)) {
      window.LyrionAtelier.products = catalog;
    }
    if (imageMap) window.LyrionAtelier.imageMap = imageMap;
    if (typeof window !== 'undefined') {
      window.resolveProductImage = resolveProductImage;
    }
  };

  const loadAndRender = async () => {
    stripDebug();
    showLoader(true);
    try {
      const [catalogRaw, imageMap] = await Promise.all([getCatalog(), getImageMap()]);
      const catalog = catalogRaw.filter(
        (p = {}) =>
          (String(p.category || '').toLowerCase() !== 'oracle') &&
          (String(p.type || '').toLowerCase() !== 'event')
      );
      const normalized = catalog.map((p) => normalize(p, imageMap || {}));
      hydrateGlobal(normalized, imageMap);
      if (!normalized.length) {
        renderEmpty();
      } else {
        renderCards(normalized);
      }
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
