const GRID_SELECTOR = '[data-shop-grid]';

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
