import { centsFrom, currencySymbol, formatPriceWithCurrency, priceNumber } from './price-utils.js';

const FALLBACK_IMAGE = '/assets/catalog/placeholder.webp';
const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout-session';
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
  const normalize = (val) => (val || '').replace(/\.html$/i, '');
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get('slug');
  if (fromQuery) return normalize(fromQuery);
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'shop' && parts[1]) return decodeURIComponent(normalize(parts[1]));
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

function renderImages(images = [], productTitle = 'Product') {
  const gallery = $('#product-gallery');
  if (!gallery) return;
  gallery.innerHTML = '';
  const normalized = Array.isArray(images) ? images.filter(Boolean).map(fullRes) : [];
  const base = normalized.length ? normalized : [FALLBACK_IMAGE];
  const sources = [...base];
  const seed = sources[0] || FALLBACK_IMAGE;
  while (sources.length < 4) {
    sources.push(seed);
  }
  sources.forEach((src, idx) => {
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${productTitle} image ${idx + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => {
      if (img.dataset.fallbackApplied === '1') return;
      img.dataset.fallbackApplied = '1';
      img.src = FALLBACK_IMAGE;
    };
    gallery.appendChild(img);
  });
}

function showError(message) {
  const wrap = $('#product-wrapper');
  if (!wrap) return;
  wrap.innerHTML = `<div class="note error">${message}</div>`;
}

async function startCheckout(variant, product, selection, btnEl = $('#add-to-cart-btn')) {
  const btn = btnEl;
  if (!variant) {
    showError('This variant is unavailable.');
    return;
  }
  const resolvedPrice = derivePrice(product, selection.size, variant);
  const storeVariantId = getStoreVariantId(variant);
  const variantId =
    storeVariantId ||
    variant?.printfulVariantId ||
    variant?.printful_variant_id ||
    variant?.variant_id ||
    variant?.id ||
    product?.pf?.variants?.[selection.size] ||
    null;
  const unitAmount = centsFrom(variant?.price ?? variant?.priceCents ?? resolvedPrice);
  if (!Number.isFinite(unitAmount)) {
    showError('Price unavailable for this variant.');
    return;
  }
  const color = selection.color ? ` • ${selection.color}` : '';
  const size = selection.size ? ` • ${selection.size}` : '';
  const metadata = {
    sku: variant.sku || variantId || '',
    size: selection.size || '',
    color: selection.color || '',
    product: product.title || ''
  };
  if (variantId) metadata.pf_variant_id = variantId;
  if (storeVariantId) {
    metadata.store_variant_id = storeVariantId;
  }
  if (product.slug) metadata.slug = product.slug;
  const lineItems = [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: {
          name: `${product.title}${color}${size}`,
          metadata
        }
      }
    }
  ];
  btn && (btn.disabled = true);
  try {
    const res = await fetch(CHECKOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lineItems,
        productType: 'merchandise',
        successUrl: `${location.origin}/success`,
        cancelUrl: `${location.origin}/shop`
      })
    });
    const data = await res.json();
    if (data?.skipRedirect === true) return;
    if (data?.url) {
      location.href = data.url;
      return;
    }
    throw new Error(data?.error || 'Could not start checkout.');
  } catch (err) {
    console.error('[checkout] failed', err);
    showError(err.message || 'Unable to start checkout.');
  } finally {
    btn && (btn.disabled = false);
  }
}

async function hydrateProductPage() {
  const slug = getSlug();
  if (!slug) {
    showError('Product not found.');
    return;
  }

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
  if (materialsEl) materialsEl.textContent = materials;
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
      addBtn.textContent = activeVariant
        ? `Add to Cart — ${formatPriceWithCurrency(displayPrice ?? activeVariant?.price, currency)}`
        : 'Unavailable';
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
    startCheckout(activeVariant, product, selection, addBtn);
  });

  updateVariant();
}

if (document.readyState !== 'loading') hydrateProductPage();
else document.addEventListener('DOMContentLoaded', hydrateProductPage);
