import { centsFrom, currencySymbol, formatPriceWithCurrency } from './price-utils.js';

const FALLBACK_IMAGE = '/assets/catalog/placeholder.webp';
const CHECKOUT_ENDPOINT = '/.netlify/functions/create-checkout-session';
const EXTENDED_SIZE = /^([2-9]?xl)$/i;
const PRICE_FALLBACK = '—';

const $ = (sel) => document.querySelector(sel);

const getStoreVariantId = (variant = {}) => variant?.store_variant_id || variant?.storeVariantId || null;

const priceFrom = (value) => {
  const cents = centsFrom(value);
  return cents !== null ? cents / 100 : null;
};

const derivePrice = (product = {}, size = null, variant = null) => {
  const variantPrice = priceFrom(variant?.price ?? variant?.priceCents ?? variant?.retail_price);
  if (variantPrice !== null) return variantPrice;
  const price = product?.price;
  if (price && typeof price === 'object') {
    const min = priceFrom(price.min);
    const max = priceFrom(price.max);
    const isExtended = typeof size === 'string' && EXTENDED_SIZE.test(size) && !/^xl$/i.test(size);
    if (isExtended && max !== null) return max;
    if (min !== null) return min;
    if (max !== null) return max;
  }
  const direct = priceFrom(product?.price ?? product?.priceCents ?? product?.raw?.price ?? product?.raw?.priceCents);
  if (direct !== null) return direct;
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
      const sizeOk = !size || v.options?.size === size;
      const colorOk = !color || !v.options?.color || v.options.color === color;
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
  const sources = Array.isArray(images) && images.length ? images : [FALLBACK_IMAGE];
  sources.forEach((src, idx) => {
    if (!src) return;
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${productTitle} image ${idx + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    const allowFallback = !/^https?:\/\//i.test(src || '');
    img.onerror = () => {
      if (allowFallback && img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
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
        successUrl: `${location.origin}/success.html`,
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
  const product = catalog.find((p) => p.slug === slug);
  if (!product) {
    showError('Product not found.');
    return;
  }

  const title = product.title || product.name || 'Product';
  document.title = `${title} | Lyrīon Atelier`;
  const pillText =
    [product.collection, product.zodiac || product.palette || product.department].filter(Boolean).join(' • ') ||
    'Collection';
  const description = product.copy?.notes || product.description || '';
  const materials = product.copy?.materials || product.materials || '';
  const care = product.copy?.care || product.care || '';
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
      .concat((product.variants || []).map((v) => v.options?.size))
  );
  const colors = unique(
    (product.options?.color || []).concat(
      (product.variants || []).map((v) => v.options?.color)
    )
  );

  const sizeSelect = $('#size-select');
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

  const galleryImages = Array.isArray(product.images) && product.images.length
    ? product.images
    : (product.image ? [product.image] : []);
  renderImages(galleryImages, title);

  let activeVariant = resolveVariant(product, sizeSelect?.value || sizes[0], colors[0]);

  const priceEl = $('#product-price');
  const addBtn = $('#add-to-cart-btn');
  const currency = product.currency || product.price?.currency || 'USD';

  function currentSelection() {
    const selectedSize = sizeSelect?.value || sizes[0] || null;
    const selectedColor =
      colorWrap?.querySelector('.chip.active')?.dataset.value || colors[0] || null;
    return { size: selectedSize, color: selectedColor };
  }

  function updateVariant() {
    const selection = currentSelection();
    activeVariant = resolveVariant(product, selection.size, selection.color);
    const displayPrice = derivePrice(product, selection.size, activeVariant);
    if (priceEl) priceEl.textContent = formatPriceWithCurrency(displayPrice ?? activeVariant?.price, currency);
    if (addBtn) {
      addBtn.disabled = !activeVariant;
      addBtn.textContent = activeVariant
        ? `Add to Cart — ${formatPriceWithCurrency(displayPrice ?? activeVariant?.price, currency)}`
        : 'Unavailable';
    }
  }

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
