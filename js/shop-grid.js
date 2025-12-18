const GRID_SELECTOR = '[data-shop-grid]';
const FALLBACK = '/assets/catalog/placeholder.webp';
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
  const pick = (...items) => items.find((x) => typeof x === 'string' && x.trim());
  const fromRemote = pick(
      p.image,
      p.images?.[0],
      p.images?.[0]?.url,
      p.images?.display,
      p.thumbnail,
      p.thumbnail_url,
      p.preview_url,
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

// Minimal, resilient product card. Never shows "Untitled" or a stuck "Image loading…"
function renderCard(product) {
  const title = product.title && product.title !== '—' ? product.title : 'Celestial Piece';
  const altText = product.title || product.name || 'Lyrion piece';
  const price = (val => {
    const n = Number(val);
    return Number.isFinite(n) ? `USD ${n.toFixed(2)}` : '';
  })(product.price);
  const imgSrc = pickImage(product, __IMAGE_MAP || {});

  const card = document.createElement('article');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="product-card__media media">
      <img loading="lazy" decoding="async" alt="${altText.replace(/"/g, '&quot;')}" />
    </div>
    <div class="product-card__body">
      <h3 class="product-card__title">${title}</h3>
      <div class="product-card__price">${price}</div>
      <div class="product-card__actions">
        <button class="btn btn-ghost" data-action="view">View</button>
        <button class="btn btn-primary" data-action="buy">Buy Now</button>
      </div>
    </div>
  `;
  const img = card.querySelector('img');
  img.src = imgSrc;
  img.onerror = () => { if (img.src !== FALLBACK) img.src = FALLBACK; };
  img.onload = () => { card.classList.add('media-ready'); };
  // wire buttons (existing handlers listen via delegation)
  card.dataset.id = product.id || product.slug;
  return card;
}

function mountGrid(list) {
  const grid =
    document.querySelector('[data-grid=\"products\"]') ||
    document.getElementById('products-grid') ||
    document.querySelector('[data-shop-grid]') ||
    document.querySelector(GRID_SELECTOR);
  if (!grid) return;
  grid.innerHTML = '';
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
