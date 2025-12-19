const FALLBACK_IMAGE = '/assets/catalog/placeholder.webp';

const $ = (sel) => document.querySelector(sel);
const formatPrice = (cents) => (Number.isFinite(cents) ? `$${(cents / 100).toFixed(2)}` : '—');

function getSlug() {
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts[0] === 'shop' && parts[1]) return decodeURIComponent(parts[1]);
  const params = new URLSearchParams(location.search);
  return params.get('slug') || null;
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
    img.onerror = () => {
      if (img.src !== FALLBACK_IMAGE) img.src = FALLBACK_IMAGE;
    };
    gallery.appendChild(img);
  });
}

function showError(message) {
  const wrap = $('#product-wrapper');
  if (!wrap) return;
  wrap.innerHTML = `<div class="note error">${message}</div>`;
}

async function startCheckout(variant, product, selection) {
  const btn = $('#add-to-cart-btn');
  if (!variant) {
    showError('This variant is unavailable.');
    return;
  }
  const unitAmount = Number.isFinite(variant.price) ? variant.price : null;
  if (!Number.isFinite(unitAmount)) {
    showError('Price unavailable for this variant.');
    return;
  }
  const color = selection.color ? ` • ${selection.color}` : '';
  const size = selection.size ? ` • ${selection.size}` : '';
  const lineItems = [
    {
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: {
          name: `${product.title}${color}${size}`,
          metadata: {
            sku: variant.sku || ''
          }
        }
      }
    }
  ];
  btn && (btn.disabled = true);
  try {
    const res = await fetch('/.netlify/functions/create-checkout-session', {
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
  const nameEl = $('#product-name');
  const descEl = $('#product-description');
  const pillEl = $('#product-pill');
  if (nameEl) nameEl.textContent = title;
  if (descEl) descEl.textContent = description;
  if (pillEl) pillEl.textContent = pillText;

  const sizes = unique(
    (product.options?.size || []).concat(
      (product.variants || []).map((v) => v.options?.size)
    )
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

  renderImages(product.images || [], title);

  let activeVariant = pickVariant(product, sizes[0], colors[0]);

  const priceEl = $('#product-price');
  const addBtn = $('#add-to-cart-btn');

  function currentSelection() {
    const selectedSize = sizeSelect?.value || sizes[0] || null;
    const selectedColor =
      colorWrap?.querySelector('.chip.active')?.dataset.value || colors[0] || null;
    return { size: selectedSize, color: selectedColor };
  }

  function updateVariant() {
    const selection = currentSelection();
    activeVariant = pickVariant(product, selection.size, selection.color);
    const cents = activeVariant?.price ?? null;
    if (priceEl) priceEl.textContent = formatPrice(cents);
    if (addBtn) {
      addBtn.disabled = !activeVariant;
      addBtn.textContent = activeVariant ? `Add to Cart — ${formatPrice(cents)}` : 'Unavailable';
    }
  }

  sizeSelect?.addEventListener('change', updateVariant);
  addBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const selection = currentSelection();
    startCheckout(activeVariant, product, selection);
  });

  updateVariant();
}

if (document.readyState !== 'loading') hydrateProductPage();
else document.addEventListener('DOMContentLoaded', hydrateProductPage);
