const GRID_SELECTOR = '[data-shop-grid]';

// Minimal, resilient product card. Never shows "Untitled" or a stuck "Image loading…"
function renderCard(product) {
  const FALLBACK_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><defs><radialGradient id="g"><stop offset="0" stop-color="%23a88cff"/><stop offset="1" stop-color="%23151a2b"/></radialGradient></defs><rect width="600" height="600" fill="url(%23g)"/><g fill="%23fff" opacity="0.85"><circle cx="100" cy="120" r="2"/><circle cx="220" cy="80" r="1.5"/><circle cx="540" cy="300" r="2"/><circle cx="320" cy="420" r="1.5"/><circle cx="460" cy="160" r="1.5"/></g></svg>';
  const title = product.title && product.title !== '—' ? product.title : 'Celestial Piece';
  const price = (val => {
    const n = Number(val);
    return Number.isFinite(n) ? `USD ${n.toFixed(2)}` : '';
  })(product.price);
  const imgSrc = product.image || FALLBACK_IMG;

  const card = document.createElement('article');
  card.className = 'product-card';
  card.innerHTML = `
    <div class="product-card__media">
      <img loading="lazy" decoding="async" alt="${title.replace(/"/g, '&quot;')}" />
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
  img.onerror = () => { img.src = FALLBACK_IMG; };
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
    image: (Array.isArray(product?.images) && product.images[0]) || product?.image || product?.thumbnail || '',
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
    if (p.image) {
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name;
      img.loading = 'lazy';
      imageWrapper.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = '✨';
      imageWrapper.appendChild(placeholder);
    }

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
