import { centsFrom, currencySymbol, formatPriceWithCurrency, priceNumber } from './price-utils.js';

const FALLBACK_IMAGE = '/assets/catalog/placeholder.webp';
const EXTENDED_SIZE = /^([2-9]?xl)$/i;
const PRICE_FALLBACK = '—';
const fullRes = (u) => (u || '').replace('_thumb', '');

const $ = (sel) => document.querySelector(sel);

const getStoreVariantId = (variant = {}) => variant?.store_variant_id || variant?.storeVariantId || null;

const priceFrom = (value) => {
  const cents = centsFrom(value);
  return cents !== null ? cents / 100 : null;
};

const variantValue = (variant = {}, key) => variant?.options?.[key] ?? variant?.[key] ?? null;

const derivePrice = (product = {}, size = null, variant = null) => {
  const variantPrice = priceFrom(priceNumber(variant));
  if (variantPrice !== null) return variantPrice;
  const priceRange = product?.price_range;
  if (priceRange && typeof priceRange === 'object') {
    const min = priceFrom(priceRange.min);
    const max = priceFrom(priceRange.max);
    const isExtended = typeof size === 'string' && EXTENDED_SIZE.test(size) && !/^xl$/i.test(size);
    if (isExtended && max !== null) return max;
    if (min !== null) return min;
    if (max !== null) return max;
  }
  const price = product?.price;
  if (price && typeof price === 'object') {
    const min = priceFrom(price.min);
    const max = priceFrom(price.max);
    const isExtended = typeof size === 'string' && EXTENDED_SIZE.test(size) && !/^xl$/i.test(size);
    if (isExtended && max !== null) return max;
    if (min !== null) return min;
    if (max !== null) return max;
  }
  const direct = priceFrom(priceNumber(product));
  if (direct !== null) return direct;
  const rawDirect = priceFrom(priceNumber(product?.raw || {}));
  if (rawDirect !== null) return rawDirect;
  return null;
};

function getSlug() {
  const params = new URLSearchParams(location.search);
  if (params.has('slug')) return params.get('slug');
  const normalize = (val) => (val || '').replace(/\.html$/i, '');
  const parts = location.pathname.split('/').filter(Boolean);
  const shopIndex = parts.indexOf('shop');
  if (shopIndex > -1 && parts[shopIndex + 1]) return decodeURIComponent(normalize(parts[shopIndex + 1]));
  if (parts[0] && parts[parts.length - 1] !== 'product') return decodeURIComponent(normalize(parts[parts.length - 1]));
  return null;
}

const slugify = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const titleForSlug = (product = {}) => product.title || product.name || product.id || '';
const slugCandidates = (product = {}) => {
  const titleSlug = slugify(titleForSlug(product));
  const idSlug = slugify(product.id || '');
  const primary = product.slug || titleSlug || idSlug;
  return Array.from(new Set([primary, titleSlug, idSlug].filter(Boolean)));
};

async function loadCatalog() {
  try {
    const res = await fetch('/data/all-products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[product] failed to load catalog', err);
    return [];
  }
}

function unique(values = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function pickVariant(product, size, color) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  return (
    variants.find((v) => {
      const variantSize = variantValue(v, 'size');
      const variantColor = variantValue(v, 'color');
      const sizeOk = !size || variantSize === size;
      const colorOk = !color || !variantColor || variantColor === color;
      return sizeOk && colorOk;
    }) || variants[0]
  );
}

function resolveVariant(product, size, color) {
  const direct = pickVariant(product, size, color);
  if (direct) return direct;
  const pfId = product?.pf?.variants?.[size] || product?.raw?.pf?.variants?.[size] || null;
  if (!pfId) return null;
  const price = derivePrice(product, size, null);
  return {
    sku: pfId,
    price,
    priceCents: centsFrom(price),
    options: { size, color },
    printfulVariantId: pfId,
    variant_id: pfId,
    id: pfId
  };
}

function applyImgSrc(img, src, productTitle) {
  if (typeof setProductImageSource === 'function') {
    setProductImageSource(img, src, productTitle);
  } else {
    const webpSrc = (typeof toWebPSrc === 'function') ? toWebPSrc(src) : src;
    img.src = webpSrc;
    img.onerror = () => {
      if (img.src === webpSrc && webpSrc !== src) {
        img.src = src;
        return;
      }
      if (img.dataset.fallbackApplied === '1') return;
      img.dataset.fallbackApplied = '1';
      img.src = FALLBACK_IMAGE;
    };
  }
}

function openImageLightbox(src, alt) {
  let lightbox = document.getElementById('soho-image-lightbox');
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'soho-image-lightbox';
    lightbox.className = 'soho-lightbox';
    lightbox.innerHTML = `
      <button type="button" class="soho-lightbox__close" aria-label="Close zoomed image">&times;</button>
      <img class="soho-lightbox__img" src="" alt="">
    `;
    document.body.appendChild(lightbox);
    const close = () => {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('soho-lightbox-open');
    };
    lightbox.querySelector('.soho-lightbox__close').addEventListener('click', close);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('is-open')) close();
    });
  }
  const img = lightbox.querySelector('.soho-lightbox__img');
  img.src = src;
  img.alt = alt;
  lightbox.classList.add('is-open');
  document.body.classList.add('soho-lightbox-open');
}

function renderImages(images = [], productTitle = 'Product') {
  const gallery = $('#product-gallery');
  if (!gallery) return;
  gallery.innerHTML = '';
  const normalized = Array.isArray(images) ? images.filter(Boolean).map(fullRes) : [];
  const base = normalized.length ? normalized : [FALLBACK_IMAGE];

  // Main display image: tap/click enlarges it in a full-screen lightbox. The
  // lightbox itself doesn't implement pinch-zoom (the site's viewport meta
  // already allows user-scalable pinch-zoom, so the browser's native gesture
  // works on the enlarged image without any extra JS).
  const mainButton = document.createElement('button');
  mainButton.type = 'button';
  mainButton.className = 'product-gallery__main-zoom';
  mainButton.setAttribute('aria-label', `Zoom in on ${productTitle}`);

  const mainImg = document.createElement('img');
  mainImg.className = 'product-gallery__main';
  mainImg.alt = productTitle;
  mainImg.loading = 'eager';
  mainImg.decoding = 'async';
  mainImg.width = 1200;
  mainImg.height = 1500;
  applyImgSrc(mainImg, base[0], productTitle);
  mainButton.appendChild(mainImg);
  mainButton.addEventListener('click', () => openImageLightbox(mainImg.src, mainImg.alt));
  gallery.appendChild(mainButton);

  // Thumbnail row (only when there are multiple distinct images)
  if (base.length > 1) {
    const thumbsWrap = document.createElement('div');
    thumbsWrap.className = 'product-gallery__thumbs';
    base.forEach((src, idx) => {
      const thumb = document.createElement('img');
      thumb.className = 'product-gallery__thumb' + (idx === 0 ? ' active' : '');
      thumb.alt = `${productTitle} — view ${idx + 1}`;
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.width = 80;
      thumb.height = 80;
      applyImgSrc(thumb, src, productTitle);
      thumb.addEventListener('click', () => {
        thumbsWrap.querySelectorAll('.product-gallery__thumb').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
        delete mainImg.dataset.fallbackApplied;
        applyImgSrc(mainImg, src, productTitle);
      });
      thumbsWrap.appendChild(thumb);
    });
    gallery.appendChild(thumbsWrap);
  }
}

function showError(message) {
  const wrap = $('#product-wrapper');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="note error">
      <p>${message}</p>
      <div class="button-row">
        <a class="btn btn-primary" href="/shop">Back to shop</a>
      </div>
    </div>`;
}

async function hydrateProductPage() {
  const slug = getSlug();
  if (!slug) return showError('Product not found.');

  const catalog = await loadCatalog();
  const slugIndex = new Map();
  catalog.forEach((p) => {
    slugCandidates(p).forEach((candidate) => {
      if (!slugIndex.has(candidate)) slugIndex.set(candidate, p);
    });
  });
  let product = slugIndex.get(slug) || null;
  if (!product) {
    showError('Product not found.');
    return;
  }
  if (!product.slug) {
    const [primarySlug] = slugCandidates(product);
    product = { ...product, slug: primarySlug || slug };
  }

  const title = product.title || product.name || 'Product';
  document.title = `${title} | Lyrīon Atelier`;
  const pillText =
    [product.collection, product.zodiac || product.palette || product.department].filter(Boolean).join(' • ') ||
    'Collection';
  const description = product.copy?.notes || product.description || '';
  const materials = product.copy?.materials || product.materials || '';
  const care = product.copy?.care || product.care || product.careInstructions || product.copy?.careInstructions || '';
  const nameEl = $('#product-name');
  const descEl = $('#product-description');
  const pillEl = $('#product-pill');
  const materialsEl = $('#product-materials');
  const careEl = $('#product-care');
  if (nameEl) nameEl.textContent = title;
  if (descEl) descEl.textContent = description;
  if (pillEl) pillEl.textContent = pillText;
  if (materialsEl) {
    materialsEl.textContent = '';
    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(materials || '').replace(/<br\s*\/?>/gi, '\n'), 'text/html');
    const sanitized = parsed.body?.textContent || '';
    const segments = sanitized.split('\n');
    const frag = document.createDocumentFragment();
    segments.forEach((segment, idx) => {
      frag.appendChild(document.createTextNode(segment));
      if (idx < segments.length - 1) frag.appendChild(document.createElement('br'));
    });
    materialsEl.appendChild(frag);
  }
  if (careEl) careEl.textContent = care;

  const sizes = unique(
    (product.options?.sizes || [])
      .concat(product.options?.size || [])
      .concat(product.sizes || [])
      .concat((product.variants || []).map((v) => variantValue(v, 'size')))
  );
  const colors = unique(
    (product.options?.color || []).concat(
      (product.variants || []).map((v) => variantValue(v, 'color'))
    )
  );

  const sizeSelect = $('#size-select');
  const sizeContainer = $('#size-selector');
  const sizeButtonsWrap = document.createElement('div');
  sizeButtonsWrap.className = 'chip-row size-chip-row';
  sizeButtonsWrap.id = 'size-buttons';
  sizeButtonsWrap.setAttribute('role', 'group');
  sizeButtonsWrap.setAttribute('aria-label', 'Select size');
  if (sizeContainer) {
    sizeContainer.appendChild(sizeButtonsWrap);
  }
  if (sizeSelect) {
    sizeSelect.innerHTML = '<option value="">Select size</option>';
    sizes.forEach((size) => {
      const opt = document.createElement('option');
      opt.value = size;
      opt.textContent = size;
      sizeSelect.appendChild(opt);
    });
    if (sizes[0]) sizeSelect.value = sizes[0];
  }
  if (sizeButtonsWrap && sizes.length) {
    sizeButtonsWrap.innerHTML = '';
    sizes.forEach((size, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip size-chip';
      btn.textContent = size;
      btn.dataset.size = size;
      btn.setAttribute('aria-pressed', idx === 0 ? 'true' : 'false');
      if (idx === 0) btn.classList.add('active');
      sizeButtonsWrap.appendChild(btn);
    });
  }

  const colorWrap = $('#color-options');
  if (colorWrap) {
    colorWrap.innerHTML = '';
    if (colors.length > 1) {
      const label = document.createElement('label');
      label.textContent = 'Color';
      colorWrap.appendChild(label);
      const list = document.createElement('div');
      list.className = 'chip-row';
      colors.forEach((color, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip';
        btn.textContent = color;
        btn.dataset.value = color;
        if (idx === 0) btn.classList.add('active');
        btn.addEventListener('click', () => {
          list.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          btn.classList.add('active');
          updateVariant();
        });
        list.appendChild(btn);
      });
      colorWrap.appendChild(list);
    } else if (colors.length === 1) {
      const label = document.createElement('div');
      label.className = 'muted';
      label.textContent = `Color: ${colors[0]}`;
      colorWrap.appendChild(label);
    }
  }

  const galleryImages = (() => {
    const imgs = [];
    if (product.image) imgs.push(product.image);
    if (Array.isArray(product.images)) imgs.push(...product.images);
    else if (product.images && typeof product.images === 'object') {
      if (product.images.card) imgs.push(product.images.card);
      if (Array.isArray(product.images.gallery)) imgs.push(...product.images.gallery);
    }
    return imgs.filter(Boolean).map(fullRes);
  })();
  renderImages(galleryImages, title);

  let activeVariant = resolveVariant(product, sizeSelect?.value || sizes[0], colors[0]);

  const priceEl = $('#product-price');
  const addBtn = $('#add-to-cart-btn');
  const currency = product.currency || product.price?.currency || 'USD';
  if (addBtn) addBtn.dataset.productId = product.id || product.slug || '';

  function currentSelection() {
    const selectedButton = sizeButtonsWrap?.querySelector('.size-chip.active');
    const selectedSize = selectedButton?.dataset.size || sizeSelect?.value || sizes[0] || null;
    const selectedColor =
      colorWrap?.querySelector('.chip.active')?.dataset.value || colors[0] || null;
    return { size: selectedSize, color: selectedColor };
  }

  function updateVariant() {
    const selection = currentSelection();
    activeVariant = resolveVariant(product, selection.size, selection.color);
    const displayPrice = derivePrice(product, selection.size, activeVariant);
    const variantId =
      getStoreVariantId(activeVariant) ||
      activeVariant?.printfulVariantId ||
      activeVariant?.printful_variant_id ||
      activeVariant?.variant_id ||
      activeVariant?.id ||
      product?.pf?.variants?.[selection.size] ||
      null;
    if (sizeButtonsWrap) {
      sizeButtonsWrap.querySelectorAll('.size-chip').forEach((btn) => {
        const isActive = btn.dataset.size === selection.size;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        if (isActive) btn.dataset.variant = variantId || '';
      });
    }
    if (priceEl) priceEl.textContent = formatPriceWithCurrency(displayPrice ?? activeVariant?.price, currency);
    if (addBtn) {
      addBtn.disabled = !activeVariant;
      addBtn.dataset.variant = variantId || '';
      addBtn.textContent = activeVariant ? 'Add to Cart' : 'Unavailable';
    }
  }

  sizeButtonsWrap?.addEventListener('click', (e) => {
    const btn = e.target.closest('.size-chip');
    if (!btn) return;
    sizeButtonsWrap.querySelectorAll('.size-chip').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    if (sizeSelect) sizeSelect.value = btn.dataset.size || '';
    updateVariant();
  });
  sizeSelect?.addEventListener('change', updateVariant);
  addBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const selection = currentSelection();
    const originalText = addBtn.textContent;
    const result =
      typeof addToCart === 'function'
        ? addToCart(product.id || product.slug, selection.size, 1, product, activeVariant)
        : { ok: false };
    if (result?.ok) {
      addBtn.textContent = 'Added ✓';
      setTimeout(() => {
        addBtn.textContent = originalText;
      }, 1200);
    }
  });

  const buyBtn = $('#buy-now-btn');
  buyBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const selection = currentSelection();
    const result =
      typeof addToCart === 'function'
        ? addToCart(product.id || product.slug, selection.size, 1, product, activeVariant)
        : { ok: false };

    if (!result?.ok) {
      showError('Unable to add this item to your cart.');
      return;
    }

    window.location.href = '/cart';
  });

  updateVariant();
}

if (document.readyState !== 'loading') hydrateProductPage();
else document.addEventListener('DOMContentLoaded', hydrateProductPage);
