import { productsReady } from '/assets/js/products.js';
import { currencySymbol, priceNumber } from '/js/price-utils.js';

const FALLBACK_IMG = '/assets/catalog/placeholder.webp';
const DEFAULT_DESC = 'A premium piece from Lyrion Atelier.';
const PRICE_CENTS_THRESHOLD = 200; // values above this are treated as integer cents
const SIZE_ORDER = ['S', 'M', 'L', 'XL', '2XL', '3XL'];
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getSlug = () => {
  const fromQuery = new URLSearchParams(window.location.search).get('slug');
  if (fromQuery) return slugify(fromQuery);
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ? slugify(parts[parts.length - 1]) : null;
};

const asPrice = (val, currency = 'USD') => {
  const num = Number(val);
  if (!Number.isFinite(num)) return '';
  const dollars = num > 1000 ? num / 100 : num;
  return `${currencySymbol(currency)}${dollars.toFixed(2)}`;
};

const toDollars = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num > PRICE_CENTS_THRESHOLD ? num / 100 : num;
};

const toCents = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num > PRICE_CENTS_THRESHOLD ? Math.round(num) : Math.round(num * 100);
};

const derivePrice = (product = {}, size = null, variant = null) => {
  const variantPrice = toDollars(priceNumber(variant));
  if (variantPrice !== null) return variantPrice;
  const price = product?.price;
  if (price && typeof price === 'object') {
    const min = toDollars(price.min);
    const max = toDollars(price.max);
    const isExtended = typeof size === 'string' && /^([2-9]?xl)$/i.test(size) && !/^xl$/i.test(size);
    if (isExtended && max !== null) return max;
    if (min !== null) return min;
    if (max !== null) return max;
  }
  const directPrice = toDollars(priceNumber(product));
  if (directPrice !== null) return directPrice;
  const rawDirect = toDollars(priceNumber(product?.raw || {}));
  if (rawDirect !== null) return rawDirect;
  return null;
};

const pickImage = (p = {}) => {
  const pick = (val) => {
    if (!val) return null;
    if (typeof val !== 'string') return null;
    if (/^https?:\/\//i.test(val)) return val;
    if (val.startsWith('/')) return val;
    return `/assets/catalog/${val}`;
  };
  return (
    pick(p.image) ||
    pick(p.raw?.image) ||
    pick(Array.isArray(p.images) ? p.images[0] : null) ||
    pick(Array.isArray(p.raw?.images) ? p.raw.images[0] : null) ||
    FALLBACK_IMG
  );
};

const warnMissingImage = (p = {}, reason = 'catalog image missing') => {
  const id = p.slug || p.title || p.name || 'product';
  console.warn(`[pdp] ${reason} for ${id}`);
};

const pickDesc = (p = {}) =>
  p.desc ||
  p.description ||
  p.copy?.notes ||
  p.raw?.desc ||
  p.raw?.description ||
  p.raw?.copy?.notes ||
  DEFAULT_DESC;

const pickSizes = (p = {}) => {
  const sizes = [
    ...(Array.isArray(p.sizes) ? p.sizes : []),
    ...(Array.isArray(p.raw?.sizes) ? p.raw.sizes : []),
    ...(Array.isArray(p.options?.sizes) ? p.options.sizes : []),
    ...(Array.isArray(p.options?.size) ? p.options.size : []),
    ...(Array.isArray(p.raw?.options?.sizes) ? p.raw.options.sizes : []),
    ...(Array.isArray(p.raw?.options?.size) ? p.raw.options.size : [])
  ].filter(Boolean);
  return Array.from(new Set(sizes));
};

const pickBuyUrl = (p = {}) =>
  p.pf_url || p.raw?.pf_url || p.external?.printfulUrl || p.raw?.external?.printfulUrl || null;

const getStoreVariantId = (variant = {}) => variant.store_variant_id || variant.storeVariantId || null;

const normalizeVariants = (p = {}) => {
  const list = Array.isArray(p.variants) ? p.variants : [];
  return list
    .map((v) => {
      const storeVariantId = getStoreVariantId(v);
      const id = storeVariantId || v.printfulVariantId || v.variant_id || v.id || v.sku || null;
      const sku = v.sku || storeVariantId || id; // Prefer brand SKU, fall back to store or Printful ID
      const size = v.options?.size || v.size || null;
      const rawPrice = priceNumber(v);
      const treatedAsCents = Number.isFinite(rawPrice) && rawPrice > PRICE_CENTS_THRESHOLD;
      const priceCents = Number.isFinite(rawPrice)
        ? Math.round(treatedAsCents ? rawPrice : rawPrice * 100)
        : null;
      const price = Number.isFinite(priceCents) ? priceCents / 100 : null;
      return id && size ? { id, sku, size, priceCents, price, storeVariantId, raw: v } : null;
    })
    .filter(Boolean);
};

const findProduct = (list = [], slug = '') => {
  const target = slugify(slug);
  return (
    list.find((p) => slugify(p.slug || p.title) === target) ||
    list.find((p) => slugify(p.raw?.slug || p.raw?.title) === target) ||
    null
  );
};

function renderProduct(product) {
  const main = document.getElementById('main-content');
  if (!main) return;
  main.innerHTML = '';

  const section = document.createElement('div');
  section.className = 'section';

  const container = document.createElement('div');
  container.className = 'container';

  const crumb = document.createElement('a');
  crumb.href = '/shop';
  crumb.className = 'pill';
  crumb.textContent = '← Back to Shop';
  container.appendChild(crumb);

  const card = document.createElement('div');
  card.className = 'card';
  card.style.display = 'grid';
  card.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
  card.style.gap = '1.5rem';

  const media = document.createElement('div');
  const img = document.createElement('img');
  img.id = 'product-image';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = product.title || product.name || '';
  const imageSrc = pickImage(product);
  img.src = imageSrc;
  img.onerror = () => {
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = 'true';
    warnMissingImage(product, 'missing image');
    img.src = FALLBACK_IMG;
  };
  if (imageSrc === FALLBACK_IMG) {
    warnMissingImage(product);
  }
  media.appendChild(img);

  const body = document.createElement('div');
  body.className = 'product-body';

  const title = document.createElement('h1');
  title.id = 'product-title';
  title.textContent = product.title || product.name || 'Product';

  let basePrice = null;
  const price = document.createElement('div');
  price.id = 'product-price';
  price.className = 'price';
  price.textContent = '';

  const desc = document.createElement('p');
  desc.id = 'product-description';
  desc.className = 'muted';
  desc.textContent = pickDesc(product);

  const variantPrices = product.variant_prices || product.raw?.variant_prices || null;
  const pfSizeMap =
    product.printful?.size_map ||
    product.raw?.printful?.size_map ||
    product.pf?.variants ||
    product.raw?.pf?.variants ||
    null;
  const variants = normalizeVariants(product);
  const state = { selectedSize: null, selectedVariantId: null };
  const variantIdForSize = (size) => {
    const match = variants.find((v) => v.size === size);
    if (match?.id) return match.id;
    const pfId = pfSizeMap && pfSizeMap[size];
    if (pfId) return pfId;
    return product.pf?.variants?.[size] || product.raw?.pf?.variants?.[size] || null;
  };
  let selectedVariant = variants[0] || null;

  const priceSized = variantPrices
    ? SIZE_ORDER.filter((size) => hasOwn(variantPrices, size))
    : [];
  const sizes = priceSized.length ? priceSized : (variants.length ? variants.map((v) => v.size) : pickSizes(product));
  const hiddenSizes = [];
  const visibleSizes = sizes.filter((size) => {
    const shouldHide = pfSizeMap && hasOwn(pfSizeMap, size) && !pfSizeMap[size];
    if (shouldHide) hiddenSizes.push(size);
    return !shouldHide;
  });

  const priceForSize = (size) => {
    if (variantPrices && hasOwn(variantPrices, size)) {
      const dollars = toDollars(variantPrices[size]);
      if (dollars !== null) return dollars;
    }
    return derivePrice(product, size, selectedVariant);
  };

  const primarySize = visibleSizes[0] || sizes[0] || selectedVariant?.size || null;
  basePrice =
    priceForSize(primarySize) ??
    toDollars(priceNumber(product)) ??
    toDollars(priceNumber(product.raw || {}));

  const currency = product.currency || product.raw?.currency || 'USD';
  const updatePrice = () => {
    const derived = priceForSize(state.selectedSize);
    const displayPrice = derived ?? basePrice;
    price.textContent = asPrice(displayPrice, currency);
  };

  let buy;
  if (visibleSizes.length) {
    const sizeWrap = document.createElement('div');
    sizeWrap.id = 'product-sizes';
    sizeWrap.className = 'size-row';
    const label = document.createElement('div');
    label.className = 'muted';
    label.textContent = 'Sizes';
    sizeWrap.appendChild(label);
    const chips = document.createElement('div');
    chips.className = 'button-row';
    const setSelected = (size) => {
      const variant = variants.find((v) => v.size === size) || null;
      const storeId = getStoreVariantId(variant);
      const pfId = variantIdForSize(size) || storeId || null;
      selectedVariant = variant || (pfId ? { id: pfId, size } : null);
      state.selectedSize = size;
      state.selectedVariantId = pfId || null;
      chips.querySelectorAll('button').forEach((btn) => {
        const active = btn.dataset.size === size;
        btn.classList.toggle('pill--active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      const canBuy = !!state.selectedVariantId && priceForSize(size) !== null;
      if (buy) buy.disabled = !canBuy;
      updatePrice();
    };
    visibleSizes.forEach((size) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pill';
      chip.textContent = size;
      chip.dataset.size = size;
      chip.dataset.variantId = variantIdForSize(size) || variants.find((v) => v.size === size)?.id || '';
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => setSelected(size));
      chips.appendChild(chip);
    });
    sizeWrap.appendChild(chips);
    body.appendChild(sizeWrap);
    if (hiddenSizes.length) {
      console.warn(`[pdp] hiding sizes without variant id: ${hiddenSizes.join(', ')}`);
    }
    const initialSize = selectedVariant?.size || visibleSizes[0];
    if (initialSize) setSelected(initialSize);
  }

  const actions = document.createElement('div');
  actions.className = 'button-row';
  buy = document.createElement('button');
  buy.id = 'buy-now-btn';
  buy.className = 'btn btn-primary';
  const buyUrl = pickBuyUrl(product);
  buy.textContent = 'Buy Now';
  buy.type = 'button';
  const initialSize = state.selectedSize || primarySize;
  const initialVariantId = state.selectedVariantId || (initialSize ? variantIdForSize(initialSize) : null);
  if (!state.selectedVariantId && initialVariantId) state.selectedVariantId = initialVariantId;
  if (!state.selectedSize && initialSize) state.selectedSize = initialSize;
  const canBuyInitial = !!initialVariantId && priceForSize(initialSize) !== null;
  buy.disabled = !canBuyInitial;
  buy.addEventListener('click', async () => {
    const variant = selectedVariant || variants.find((v) => v.size === state.selectedSize) || variants[0] || null;
    const storeVariantId = getStoreVariantId(variant) || getStoreVariantId(variant?.raw || {});
    const variantId = state.selectedVariantId || storeVariantId || variant?.id || variant?.sku || null;
    if (!variantId) return;
    const priceValue = priceForSize(state.selectedSize);
    const priceCents = toCents(priceValue ?? basePrice);
    if (!Number.isFinite(priceCents)) return;
    const quantity = 1;
    const payload = {
      title: product.title || product.name || 'Product',
      slug: product.slug || slugify(product.title || product.name || ''),
      sku: variant.sku || variantId,
      pf_variant_id: variantId,
      store_variant_id: storeVariantId || null,
      size: state.selectedSize || variant?.size || null,
      quantity,
      qty: quantity, // legacy alias for handlers expecting { sku, qty }
      price: priceCents,
      image: imageSrc
    };
    try {
      document.dispatchEvent(new CustomEvent('cart:checkout', { detail: { items: [payload] } }));
    } catch (_) {}
    if (typeof window.initiateCheckout === 'function') {
      await window.initiateCheckout({
        name: payload.title,
        price: priceCents ? priceCents / 100 : basePrice,
        type: 'merchandise',
        variantId,
        quantity
      });
    } else {
      try {
        const res = await fetch('/.netlify/functions/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin: window.location.origin, items: [payload] })
        });
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
          return;
        }
      } catch (_) {}
      if (buyUrl) {
        window.open(buyUrl, '_blank', 'noopener,noreferrer');
      }
    }
  });
  const back = document.createElement('a');
  back.href = '/shop';
  back.className = 'btn btn-outline';
  back.textContent = 'Back to Shop';
  actions.appendChild(buy);
  actions.appendChild(back);

  body.appendChild(title);
  body.appendChild(price);
  body.appendChild(desc);
  body.appendChild(actions);
  updatePrice();

  card.appendChild(media);
  card.appendChild(body);
  container.appendChild(card);
  section.appendChild(container);
  main.appendChild(section);
  document.title = `${title.textContent} | Lyrīon Atelier`;
}

(async function init() {
  const slug = getSlug();
  if (!slug) {
    window.location.replace('/shop');
    return;
  }
  let catalog = [];
  try {
    catalog = await productsReady;
  } catch (err) {
    console.warn('[pdp] failed to load catalog', err);
    window.location.replace('/shop');
    return;
  }
  const product = findProduct(catalog || [], slug);
  if (!product) {
    window.location.replace('/shop');
    return;
  }
  renderProduct(product);
})();
