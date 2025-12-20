import { productsReady } from '/assets/js/products.js';

const FALLBACK_IMG = '/assets/catalog/placeholder.webp';
const DEFAULT_DESC = 'A premium piece from Lyrion Atelier.';
const PRICE_CENTS_THRESHOLD = 200; // values above this are treated as integer cents

const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getSlug = () => {
  const fromQuery = new URLSearchParams(window.location.search).get('slug');
  if (fromQuery) return slugify(fromQuery);
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] ? slugify(parts[parts.length - 1]) : null;
};

const asPrice = (val) => {
  const num = Number(val);
  if (!Number.isFinite(num)) return '';
  const dollars = num > 1000 ? num / 100 : num;
  return `$${dollars.toFixed(2)}`;
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
    ...(Array.isArray(p.options?.size) ? p.options.size : []),
    ...(Array.isArray(p.raw?.options?.size) ? p.raw.options.size : [])
  ].filter(Boolean);
  return Array.from(new Set(sizes));
};

const pickBuyUrl = (p = {}) =>
  p.pf_url || p.raw?.pf_url || p.external?.printfulUrl || p.raw?.external?.printfulUrl || null;

const normalizeVariants = (p = {}) => {
  const list = Array.isArray(p.variants) ? p.variants : [];
  return list
    .map((v) => {
      const id = v.printfulVariantId || v.variant_id || v.id || v.sku || null;
      const sku = v.sku || id; // Prefer brand SKU, fall back to Printful ID
      const size = v.options?.size || v.size || null;
      const rawPrice = Number(v.price ?? v.retail_price);
      const treatedAsCents = Number.isFinite(rawPrice) && rawPrice > PRICE_CENTS_THRESHOLD;
      const priceCents = Number.isFinite(rawPrice)
        ? Math.round(treatedAsCents ? rawPrice : rawPrice * 100)
        : null;
      const price = Number.isFinite(priceCents) ? priceCents / 100 : null;
      return id && size ? { id, sku, size, priceCents, price, raw: v } : null;
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
    if (img.src !== FALLBACK_IMG) {
      warnMissingImage(product, 'missing image');
      img.src = FALLBACK_IMG;
    }
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

  const basePrice =
    product.price ??
    product.priceCents ??
    product.variants?.[0]?.price ??
    product.variants?.[0]?.retail_price ??
    product.raw?.price ??
    product.raw?.variants?.[0]?.price ??
    product.raw?.variants?.[0]?.retail_price ??
    null;
  const price = document.createElement('div');
  price.id = 'product-price';
  price.className = 'price';
  price.textContent = asPrice(basePrice);

  const desc = document.createElement('p');
  desc.id = 'product-description';
  desc.className = 'muted';
  desc.textContent = pickDesc(product);

  const variants = normalizeVariants(product);
  let selectedVariant = variants[0] || null;

  const updatePrice = () => {
    const variantPrice = Number.isFinite(selectedVariant?.price)
      ? selectedVariant.price
      : Number.isFinite(selectedVariant?.priceCents)
        ? selectedVariant.priceCents / 100
        : null;
    const fallback = Number.isFinite(basePrice) ? Number(basePrice) : null;
    const displayPrice = variantPrice ?? fallback;
    price.textContent = asPrice(displayPrice);
  };

  let buy;
  const sizes = variants.length ? variants.map((v) => v.size) : pickSizes(product);
  if (sizes.length) {
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
      selectedVariant = variant;
      chips.querySelectorAll('button').forEach((btn) => {
        const active = btn.dataset.size === size;
        btn.classList.toggle('pill--active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      if (buy) buy.disabled = !selectedVariant;
      updatePrice();
    };
    sizes.forEach((size) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'pill';
      chip.textContent = size;
      chip.dataset.size = size;
      chip.dataset.variantId = variants.find((v) => v.size === size)?.id || '';
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', () => setSelected(size));
      chips.appendChild(chip);
    });
    sizeWrap.appendChild(chips);
    body.appendChild(sizeWrap);
    const initialSize = selectedVariant?.size || sizes[0];
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
  buy.disabled = !selectedVariant;
  buy.addEventListener('click', async () => {
    const variant = selectedVariant || variants[0] || null;
    if (!variant) return;
    const priceCents =
      variant.priceCents ??
      (Number.isFinite(basePrice) ? Math.round(Number(basePrice) * 100) : null);
    const quantity = 1;
    const payload = {
      title: product.title || product.name || 'Product',
      sku: variant.id,
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
        variantId: variant.id
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
