const GRID_SELECTOR = '[data-shop-grid]';
const FALLBACK = '/assets/catalog/placeholder.webp';
const PRICE_CENTS_THRESHOLD = 200;
const slugify = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
let __IMAGE_MAP = {};
let __MAP_PROMISE = null;

async function loadImageMap(){
  if (__MAP_PROMISE) return __MAP_PROMISE;
  __MAP_PROMISE = fetch('/data/image-map.json', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : {})
    .catch(() => ({}));
  return __MAP_PROMISE;
}

function pickImage(p = {}, imageMap = {}) {
  const pick = (...items) => items.find((x) => typeof x === 'string' && String(x).trim());
  if (typeof window !== 'undefined' && typeof window.resolveProductImage === 'function') {
    const zodiacMap = window.LyrionAtelier?.zodiacImages || {};
    return window.resolveProductImage(p, imageMap, zodiacMap);
  }
  const isHttp = (val) => typeof val === 'string' && /^https?:\/\//i.test(val.trim());
  if (isHttp(p.image)) return p.image.trim();
  const fromImages = Array.isArray(p.images)
    ? p.images
        .map((img) => (typeof img === 'string' ? img : pick(img?.url, img?.src, img?.preview_url, img?.thumbnail_url)))
        .find(isHttp)
    : null;
  return fromImages || FALLBACK;
}

function pickVariant(product = {}) {
  if (typeof window !== 'undefined' && typeof window.pickVariant === 'function') {
    return window.pickVariant(product);
  }
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (!variants.length) return null;
  return variants.find((v) => (v?.inStock ?? true) && (v?.state?.published ?? true) && (v?.state?.ready ?? true)) || variants[0];
}

function resolvePrice(p = {}) {
  const base = p.price ?? p.priceUSD ?? p.variants?.[0]?.price ?? p.variants?.[0]?.retail_price;
  const num = typeof base === 'number' ? base : Number(base);
  return Number.isFinite(num) ? (num > PRICE_CENTS_THRESHOLD ? num / 100 : num) : null;
}

// Minimal, resilient product card. Never shows "Untitled" or a stuck "Image loading…"
function renderCard(product) {
  const title = product.title && product.title !== '—' ? product.title : (product.name || 'Celestial Piece');
  const altText = product.title || product.name || 'Lyrion piece';
  const variant = pickVariant(product);
  const priceNum = resolvePrice(variant) ?? resolvePrice(product);
  const imgSrc = pickImage(product, __IMAGE_MAP || {});
  const slug = product.slug || slugify(product.title || product.name || '');
  const viewUrl = `/shop/${slug}.html`;

  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = product.id || slug;
  card.dataset.slug = slug;

  const media = document.createElement('div');
  media.className = 'product-card__media media';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.decoding = 'async';
  img.alt = altText;
  img.src = imgSrc;
  img.onerror = () => { if (img.src !== FALLBACK) img.src = FALLBACK; };
  img.onload = () => { card.classList.add('media-ready'); };
  media.appendChild(img);

  const body = document.createElement('div');
  body.className = 'product-card__body';
  const heading = document.createElement('h3');
  heading.className = 'product-card__title';
  heading.textContent = title;
  const price = document.createElement('div');
  price.className = 'product-card__price';
  price.textContent = Number.isFinite(priceNum) ? `USD ${priceNum.toFixed(2)}` : '';

  const actions = document.createElement('div');
  actions.className = 'product-card__actions';
  const view = document.createElement('a');
  view.className = 'btn btn-ghost';
  view.href = viewUrl;
  view.textContent = 'View';
  view.dataset.action = 'view';

  const buy = document.createElement('a');
  buy.className = 'btn btn-primary product-buy-btn';
  buy.textContent = 'View Product';
  buy.href = viewUrl;
  buy.dataset.name = title;
  buy.dataset.slug = slug;
  buy.addEventListener('click', (e) => e.stopPropagation());

  actions.append(view, buy);
  body.append(heading, price, actions);
  card.append(media, body);
  card.addEventListener('click', (e) => {
    if (e.target.closest('.product-buy-btn')) return;
    window.location.href = viewUrl;
  });
  return card;
}

function mountGrid(list) {
  __IMAGE_MAP = window.LyrionAtelier?.imageMap || __IMAGE_MAP || {};
  const grid =
    document.querySelector('[data-grid=\"products\"]') ||
    document.getElementById('products-grid') ||
    document.querySelector('[data-shop-grid]') ||
    document.querySelector(GRID_SELECTOR);
  if (!grid) return;
  grid.innerHTML = '';
  grid.style.display = '';
  (list || []).forEach(p => grid.appendChild(renderCard(p)));
}

function normalize(product){
  const priceRaw = product?.price ?? product?.priceUSD ?? product?.variants?.[0]?.price;
  const priceNum = typeof priceRaw === 'number'
    ? (priceRaw > 200 ? priceRaw / 100 : priceRaw)
    : (typeof priceRaw === 'string' && priceRaw.trim() ? Number(priceRaw) : null);
  return {
    source: product,
    name: product?.name || product?.title || product?.slug || 'Untitled',
    image: pickImage(product, __IMAGE_MAP || {}),
    description: product?.description || product?.copy?.notes || '',
    price: Number.isFinite(priceNum) ? priceNum : null,
    zodiac: (product?.zodiac || product?.metadata?.zodiac || '').toLowerCase(),
    category: (product?.category || product?.metadata?.category || product?.subcategory || product?.department || '').toLowerCase(),
  };
}

function filterByControls(items){
  const category = (document.getElementById('filter-category')?.value || 'all').toLowerCase();
  const zodiac = (document.getElementById('filter-zodiac')?.value || 'all').toLowerCase();
  return items.map(normalize).filter(p => {
    const catOk = category === 'all' || p.category === category;
    const zOk = zodiac === 'all' || p.zodiac === zodiac;
    return catOk && zOk;
  });
}

function renderGrid(items){
  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;
  grid.innerHTML = '';
  items.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card product-card';

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'card__image';
    const img = document.createElement('img');
    img.src = pickImage(p, __IMAGE_MAP || {});
    img.alt = p.name || 'Lyrion piece';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.onerror = () => { if (img.src !== FALLBACK) img.src = FALLBACK; };
    imageWrapper.appendChild(img);

    const infoWrapper = document.createElement('div');
    infoWrapper.className = 'card__body';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = p.name;

    const desc = document.createElement('p');
    desc.className = 'card__desc muted';
    desc.textContent = p.description || '';

    const price = document.createElement('p');
    price.className = 'card__price price';
    price.textContent = Number.isFinite(p.price) ? `$${p.price.toFixed(2)}` : 'Price unavailable';

    infoWrapper.append(title, desc, price);
    card.append(imageWrapper, infoWrapper);
    grid.appendChild(card);
  });
}

function renderEmpty(){
  const grid = document.querySelector(GRID_SELECTOR);
  if (!grid) return;
  grid.innerHTML = `
  <div class="card card--empty">
    <div class="card-body">
      <h4>We’re aligning the stars ✨</h4>
      <p>Catalog is updating. Please check back shortly.</p>
    </div>
  </div>`;
}

export function init(products){
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  const filtered = filterByControls(list);
  if (!filtered.length) { return renderEmpty(); }
  renderGrid(filtered);
}

if (typeof window !== 'undefined') {
  window.mountGrid = mountGrid;
}
